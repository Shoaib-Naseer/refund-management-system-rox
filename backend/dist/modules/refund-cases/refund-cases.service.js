"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RefundCasesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundCasesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const refund_case_entity_1 = require("../../entities/refund-case.entity");
const verification_service_1 = require("../verification/verification.service");
const refund_processing_service_1 = require("../refund-processing/refund-processing.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
let RefundCasesService = RefundCasesService_1 = class RefundCasesService {
    constructor(refundCaseRepo, verificationService, refundProcessingService, auditLogsService) {
        this.refundCaseRepo = refundCaseRepo;
        this.verificationService = verificationService;
        this.refundProcessingService = refundProcessingService;
        this.auditLogsService = auditLogsService;
        this.logger = new common_1.Logger(RefundCasesService_1.name);
    }
    async create(createDto, userContext, bulkOperationId) {
        this.logger.log(`Creating refund case for MSISDN: ${createDto.msisdn}`);
        const caseNumber = await this.generateCaseNumber();
        const normalizedMsisdn = this.normalizeMsisdn(createDto.msisdn);
        const refundCase = this.refundCaseRepo.create({
            caseNumber,
            msisdn: normalizedMsisdn,
            amount: createDto.amount ?? null,
            paymentMethod: createDto.paymentMethod ?? null,
            accountNumber: createDto.accountNumber,
            packageCode: createDto.packageCode,
            orderId: createDto.orderId,
            transactionDatetime: createDto.transactionDatetime
                ? new Date(createDto.transactionDatetime)
                : null,
            status: refund_case_entity_1.RefundCaseStatus.PENDING,
            bulkOperationId: bulkOperationId || null,
            createdBy: createDto.createdBy || userContext?.username || 'system',
        });
        await this.refundCaseRepo.save(refundCase);
        await this.auditLogsService.log({
            refundCaseId: refundCase.id,
            action: 'created',
            newValue: {
                caseNumber,
                msisdn: normalizedMsisdn,
                amount: createDto.amount,
                bulkOperationId: bulkOperationId || null,
            },
            description: bulkOperationId
                ? `Refund case created from bulk operation`
                : 'Refund case created',
            performedBy: refundCase.createdBy,
            ipAddress: userContext?.ip,
            userAgent: userContext?.userAgent,
        });
        await this.verifyCase(refundCase.id, userContext);
        return this.findOne(refundCase.id);
    }
    async verifyCase(id, userContext) {
        const refundCase = await this.findOne(id);
        this.logger.log(`Verifying case: ${refundCase.caseNumber}`);
        const verificationResult = await this.verificationService.verifyCase({
            msisdn: refundCase.msisdn,
            amount: refundCase.amount != null ? Number(refundCase.amount) : null,
            orderId: refundCase.orderId,
            transactionDatetime: refundCase.transactionDatetime,
        });
        refundCase.verificationResult = verificationResult.result;
        refundCase.verificationComment = verificationResult.comment;
        refundCase.eligibilityChecks = verificationResult.checks;
        refundCase.sourceTransactionId = verificationResult.sourceTransactionId;
        refundCase.sourceSnapshot = verificationResult.sourceRecord || null;
        refundCase.verifiedAt = new Date();
        refundCase.verifiedBy = userContext?.username || 'system';
        if (verificationResult.result === refund_case_entity_1.VerificationResult.APPROVED) {
            refundCase.status = refund_case_entity_1.RefundCaseStatus.VERIFIED;
        }
        else {
            refundCase.status = refund_case_entity_1.RefundCaseStatus.REJECTED;
        }
        await this.refundCaseRepo.save(refundCase);
        await this.auditLogsService.log({
            refundCaseId: refundCase.id,
            action: 'verified',
            newValue: {
                verificationResult: verificationResult.result,
                status: refundCase.status,
            },
            description: `Case verified: ${verificationResult.comment}`,
            performedBy: refundCase.verifiedBy,
            ipAddress: userContext?.ip,
            userAgent: userContext?.userAgent,
        });
        return refundCase;
    }
    async processRefund(id, userContext) {
        const refundCase = await this.findOne(id);
        if (refundCase.verificationResult !== refund_case_entity_1.VerificationResult.APPROVED) {
            throw new Error('Case must be verified and approved before processing refund');
        }
        if (refundCase.refundStatus === refund_case_entity_1.RefundStatus.SUCCESS) {
            throw new Error('Refund already processed successfully for this case');
        }
        this.logger.log(`Processing refund for case: ${refundCase.caseNumber}`);
        refundCase.status = refund_case_entity_1.RefundCaseStatus.PROCESSING;
        await this.refundCaseRepo.save(refundCase);
        try {
            const refundResult = await this.refundProcessingService.processRefund(refundCase.paymentMethod, {
                orderId: refundCase.orderId,
                amount: Number(refundCase.amount),
                msisdn: refundCase.msisdn,
                accountNumber: refundCase.accountNumber,
            });
            refundCase.refundStatus = refundResult.success
                ? refund_case_entity_1.RefundStatus.SUCCESS
                : refund_case_entity_1.RefundStatus.FAILED;
            refundCase.refundDescription = refundResult.description;
            refundCase.refundRawResponse = JSON.stringify(refundResult.rawResponse);
            refundCase.refundProcessedAt = new Date();
            refundCase.refundProcessedBy = userContext?.username || 'system';
            refundCase.status = refundResult.success
                ? refund_case_entity_1.RefundCaseStatus.REFUNDED
                : refund_case_entity_1.RefundCaseStatus.FAILED;
            await this.refundCaseRepo.save(refundCase);
            await this.auditLogsService.log({
                refundCaseId: refundCase.id,
                action: 'refunded',
                newValue: {
                    refundStatus: refundCase.refundStatus,
                    status: refundCase.status,
                },
                description: `Refund ${refundResult.success ? 'successful' : 'failed'}: ${refundResult.description}`,
                performedBy: refundCase.refundProcessedBy,
                ipAddress: userContext?.ip,
                userAgent: userContext?.userAgent,
            });
            return refundCase;
        }
        catch (error) {
            this.logger.error(`Refund processing error: ${error.message}`);
            refundCase.refundStatus = refund_case_entity_1.RefundStatus.FAILED;
            refundCase.refundDescription = `Error: ${error.message}`;
            refundCase.status = refund_case_entity_1.RefundCaseStatus.FAILED;
            await this.refundCaseRepo.save(refundCase);
            throw error;
        }
    }
    async findAll(queryDto) {
        const page = parseInt(queryDto.page) || 1;
        const limit = parseInt(queryDto.limit) || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (queryDto.status) {
            where.status = queryDto.status;
        }
        if (queryDto.verificationResult) {
            where.verificationResult = queryDto.verificationResult;
        }
        if (queryDto.refundStatus) {
            where.refundStatus = queryDto.refundStatus;
        }
        if (queryDto.paymentMethod) {
            where.paymentMethod = queryDto.paymentMethod;
        }
        if (queryDto.search) {
            where.caseNumber = (0, typeorm_2.Like)(`%${queryDto.search}%`);
        }
        if (queryDto.msisdn) {
            where.msisdn = this.normalizeMsisdn(queryDto.msisdn);
        }
        if (queryDto.startDate && queryDto.endDate) {
            where.createdAt = (0, typeorm_2.Between)(new Date(queryDto.startDate), new Date(queryDto.endDate));
        }
        const [data, total] = await this.refundCaseRepo.findAndCount({
            where,
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { data, total, page, limit };
    }
    async findOne(id) {
        const refundCase = await this.refundCaseRepo.findOne({
            where: { id },
            relations: ['auditLogs', 'notifications', 'bulkOperation'],
        });
        if (!refundCase) {
            throw new common_1.NotFoundException(`Refund case with ID ${id} not found`);
        }
        return refundCase;
    }
    async findAllByMsisdn(msisdn) {
        const normalizedMsisdn = this.normalizeMsisdn(msisdn);
        return this.refundCaseRepo.find({
            where: { msisdn: normalizedMsisdn },
            relations: ['auditLogs', 'notifications'],
            order: { createdAt: 'DESC' },
        });
    }
    async findByCaseNumber(caseNumber) {
        const refundCase = await this.refundCaseRepo.findOne({
            where: { caseNumber },
            relations: ['auditLogs', 'notifications', 'bulkOperation'],
        });
        if (!refundCase) {
            throw new common_1.NotFoundException(`Refund case with number ${caseNumber} not found`);
        }
        return refundCase;
    }
    async findByBulkOperationId(bulkOperationId) {
        return this.refundCaseRepo.find({
            where: { bulkOperationId },
            order: { createdAt: 'ASC' },
        });
    }
    async generateCaseNumber() {
        const year = new Date().getFullYear();
        const prefix = `RC-${year}-`;
        const lastCase = await this.refundCaseRepo
            .createQueryBuilder('rc')
            .where('rc.case_number LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('rc.case_number', 'DESC')
            .getOne();
        let nextNumber = 1;
        if (lastCase) {
            const lastNumber = parseInt(lastCase.caseNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }
        return `${prefix}${String(nextNumber).padStart(6, '0')}`;
    }
    normalizeMsisdn(msisdn) {
        msisdn = msisdn.replace(/[\s-]/g, '');
        if (msisdn.startsWith('0')) {
            return '92' + msisdn.substring(1);
        }
        else if (!msisdn.startsWith('92')) {
            return '92' + msisdn;
        }
        return msisdn;
    }
};
exports.RefundCasesService = RefundCasesService;
exports.RefundCasesService = RefundCasesService = RefundCasesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(refund_case_entity_1.RefundCase)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        verification_service_1.VerificationService,
        refund_processing_service_1.RefundProcessingService,
        audit_logs_service_1.AuditLogsService])
], RefundCasesService);
//# sourceMappingURL=refund-cases.service.js.map