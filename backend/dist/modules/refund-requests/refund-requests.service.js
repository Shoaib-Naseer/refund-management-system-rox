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
var RefundRequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundRequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bull_1 = require("@nestjs/bull");
const refund_request_entity_1 = require("../../entities/refund-request.entity");
const refund_case_entity_1 = require("../../entities/refund-case.entity");
const bulk_operation_entity_1 = require("../../entities/bulk-operation.entity");
const refund_processing_service_1 = require("../refund-processing/refund-processing.service");
const msisdn_utils_1 = require("../verification/msisdn-utils");
const notifications_service_1 = require("../notifications/notifications.service");
function normalizePaymentMethodForGateway(raw) {
    const key = (raw || "").toUpperCase().replace(/_/g, "");
    if (key === "JAZZCASH")
        return "Jazz_Cash";
    if (key === "CARD")
        return "Card";
    return "Easy_Paisa";
}
const NON_RESUBMITTABLE_STATUSES = [
    refund_request_entity_1.RefundRequestStatus.SUBMITTED,
    refund_request_entity_1.RefundRequestStatus.UNDER_REVIEW,
    refund_request_entity_1.RefundRequestStatus.APPROVED,
    refund_request_entity_1.RefundRequestStatus.PROCESSING,
    refund_request_entity_1.RefundRequestStatus.REFUNDED,
];
let RefundRequestsService = RefundRequestsService_1 = class RefundRequestsService {
    constructor(refundRequestRepo, refundCaseRepo, bulkOperationRepo, refundProcessingService, dataSource, refundQueue, notificationsService) {
        this.refundRequestRepo = refundRequestRepo;
        this.refundCaseRepo = refundCaseRepo;
        this.bulkOperationRepo = bulkOperationRepo;
        this.refundProcessingService = refundProcessingService;
        this.dataSource = dataSource;
        this.refundQueue = refundQueue;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(RefundRequestsService_1.name);
    }
    async resolveRefundCaseId(dto, user) {
        if (dto.refundCaseId) {
            const explicitCase = await this.refundCaseRepo.findOne({
                where: { id: dto.refundCaseId },
            });
            if (!explicitCase) {
                throw new common_1.BadRequestException(`No RefundCase found with id ${dto.refundCaseId}.`);
            }
            this.logger.log(`[RefundRequest] Linked to explicit refundCaseId ${dto.refundCaseId}`);
            return explicitCase.id;
        }
        const hr = dto.historyRecord;
        const candidateOrderIds = [hr.orderId, hr.paymentOrderId].filter(Boolean);
        if (candidateOrderIds.length > 0) {
            const byOrderId = await this.refundCaseRepo.findOne({
                where: candidateOrderIds.map((orderId) => ({ orderId })),
                order: { createdAt: "DESC" },
            });
            if (byOrderId) {
                this.logger.log(`[RefundRequest] Auto-linked to RefundCase #${byOrderId.id} via matching orderId`);
                return byOrderId.id;
            }
        }
        const normalizedMsisdn = (0, msisdn_utils_1.toSubscriberFormat)(dto.msisdn);
        const byMsisdn = await this.refundCaseRepo.findOne({
            where: { msisdn: normalizedMsisdn },
            order: { createdAt: "DESC" },
        });
        if (byMsisdn) {
            this.logger.log(`[RefundRequest] No orderId match — auto-linked to most recent RefundCase #${byMsisdn.id} for MSISDN ${normalizedMsisdn}`);
            return byMsisdn.id;
        }
        this.logger.log(`[RefundRequest] No RefundCase found to link for MSISDN ${normalizedMsisdn} — generating new case`);
        let paymentMethodEnum = null;
        const pmUpper = String(hr.paymentMethod || "")
            .toUpperCase()
            .replace(/_/g, "");
        if (pmUpper === "EASYPAISA")
            paymentMethodEnum = "Easy_Paisa";
        else if (pmUpper === "JAZZCASH")
            paymentMethodEnum = "Jazz_Cash";
        else if (pmUpper === "CARD" || pmUpper === "MCBCARD")
            paymentMethodEnum = "Card";
        const newCase = this.refundCaseRepo.create({
            caseNumber: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            msisdn: normalizedMsisdn,
            amount: dto.requestedRefundAmount || Number(hr.amountDeducted) || 0,
            paymentMethod: paymentMethodEnum,
            accountNumber: hr.walletNumber || null,
            packageCode: hr.packageName || null,
            orderId: hr.orderId || hr.paymentOrderId || hr.transactionReference || null,
            transactionDatetime: hr.timestamp ? new Date(hr.timestamp) : new Date(),
            status: refund_case_entity_1.RefundCaseStatus.PENDING,
            refundStatus: refund_case_entity_1.RefundStatus.NOT_PROCESSED,
            sourceSnapshot: hr,
            createdBy: user.username,
        });
        const savedCase = await this.refundCaseRepo.save(newCase);
        this.logger.log(`[RefundRequest] Generated and linked new RefundCase #${savedCase.id}`);
        return savedCase.id;
    }
    async resolveRefundCaseIdsBatch(manager, records, user) {
        const result = new Map();
        const explicitIds = [...new Set(records.filter((r) => r.refundCaseId).map((r) => r.refundCaseId))];
        const explicitCases = explicitIds.length
            ? await manager.find(refund_case_entity_1.RefundCase, { where: { id: (0, typeorm_2.In)(explicitIds) } })
            : [];
        const caseById = new Map(explicitCases.map((c) => [c.id, c]));
        const remaining = records.filter((r) => !r.refundCaseId || !caseById.has(r.refundCaseId));
        for (const r of records) {
            const txnRef = r.historyRecord?.transactionReference;
            if (r.refundCaseId && caseById.has(r.refundCaseId) && txnRef) {
                result.set(txnRef, r.refundCaseId);
            }
            else if (r.refundCaseId && txnRef) {
                throw new common_1.BadRequestException(`No RefundCase found with id ${r.refundCaseId}.`);
            }
        }
        const orderIds = [
            ...new Set(remaining.flatMap((r) => [r.historyRecord?.orderId, r.historyRecord?.paymentOrderId]).filter(Boolean)),
        ];
        const casesByOrderId = orderIds.length
            ? await manager.find(refund_case_entity_1.RefundCase, { where: { orderId: (0, typeorm_2.In)(orderIds) }, order: { createdAt: 'DESC' } })
            : [];
        const bestCaseForOrderId = new Map();
        for (const c of casesByOrderId) {
            if (c.orderId && !bestCaseForOrderId.has(c.orderId))
                bestCaseForOrderId.set(c.orderId, c);
        }
        const stillRemaining = [];
        for (const r of remaining) {
            const txnRef = r.historyRecord?.transactionReference;
            const candidateOrderIds = [r.historyRecord?.orderId, r.historyRecord?.paymentOrderId].filter(Boolean);
            const match = candidateOrderIds.map((id) => bestCaseForOrderId.get(id)).find(Boolean);
            if (match && txnRef) {
                result.set(txnRef, match.id);
            }
            else {
                stillRemaining.push(r);
            }
        }
        const normalizedMsisdns = [
            ...new Set(stillRemaining.map((r) => (0, msisdn_utils_1.toSubscriberFormat)(r.msisdn)).filter(Boolean)),
        ];
        const casesByMsisdn = normalizedMsisdns.length
            ? await manager.find(refund_case_entity_1.RefundCase, { where: { msisdn: (0, typeorm_2.In)(normalizedMsisdns) }, order: { createdAt: 'DESC' } })
            : [];
        const bestCaseForMsisdn = new Map();
        for (const c of casesByMsisdn) {
            if (c.msisdn && !bestCaseForMsisdn.has(c.msisdn))
                bestCaseForMsisdn.set(c.msisdn, c);
        }
        for (const r of stillRemaining) {
            const txnRef = r.historyRecord?.transactionReference;
            const normalizedMsisdn = (0, msisdn_utils_1.toSubscriberFormat)(r.msisdn);
            const match = bestCaseForMsisdn.get(normalizedMsisdn);
            if (match && txnRef) {
                result.set(txnRef, match.id);
                continue;
            }
            const hr = r.historyRecord;
            let paymentMethodEnum = null;
            const pmUpper = String(hr.paymentMethod || '').toUpperCase().replace(/_/g, '');
            if (pmUpper === 'EASYPAISA')
                paymentMethodEnum = 'Easy_Paisa';
            else if (pmUpper === 'JAZZCASH')
                paymentMethodEnum = 'Jazz_Cash';
            else if (pmUpper === 'CARD' || pmUpper === 'MCBCARD')
                paymentMethodEnum = 'Card';
            const newCase = manager.create(refund_case_entity_1.RefundCase, {
                caseNumber: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                msisdn: normalizedMsisdn,
                amount: r.requestedRefundAmount || Number(hr.amountDeducted) || 0,
                paymentMethod: paymentMethodEnum,
                accountNumber: hr.walletNumber || null,
                packageCode: hr.packageName || null,
                orderId: hr.orderId || hr.paymentOrderId || hr.transactionReference || null,
                transactionDatetime: hr.timestamp ? new Date(hr.timestamp) : new Date(),
                status: refund_case_entity_1.RefundCaseStatus.PENDING,
                refundStatus: refund_case_entity_1.RefundStatus.NOT_PROCESSED,
                sourceSnapshot: hr,
                createdBy: user.username,
            });
            const savedCase = await manager.save(refund_case_entity_1.RefundCase, newCase);
            if (txnRef)
                result.set(txnRef, savedCase.id);
            bestCaseForMsisdn.set(normalizedMsisdn, savedCase);
        }
        return result;
    }
    async create(dto, user) {
        const hr = dto.historyRecord;
        if (hr.era == null ||
            !hr.transactionReference ||
            hr.amountDeducted == null) {
            throw new common_1.BadRequestException("historyRecord must include at least era, transactionReference, and amountDeducted (pass through the row from GET /api/history/:msisdn as-is)");
        }
        const duplicate = await this.refundRequestRepo.findOne({
            where: {
                transactionReference: hr.transactionReference,
            },
        });
        if (duplicate) {
            throw new common_1.BadRequestException(`A refund request already exists for this transaction (request #${duplicate.id}, status: ${duplicate.status}).`);
        }
        const isEligible = hr.refundEligibility === "Eligible";
        let requiresOverrideApproval = false;
        if (!isEligible) {
            if (!dto.isOverride) {
                throw new common_1.BadRequestException(`This transaction is not eligible for refund (refundEligibility=${hr.refundEligibility ?? "unknown"}, packagePosted=${hr.packagePosted ?? "unknown"}). ` +
                    `If this is a valid exception (e.g. a testing case), resubmit with isOverride=true and an overrideJustification.`);
            }
            if (!dto.overrideJustification || !dto.overrideJustification.trim()) {
                throw new common_1.BadRequestException("overrideJustification is required when isOverride is true.");
            }
            requiresOverrideApproval = true;
        }
        const loanAmount = Number(hr.loanAmount ?? 0);
        const amountDeducted = Number(hr.amountDeducted);
        const serverComputedAmount = Math.max(amountDeducted - loanAmount, 0);
        const claimedAmount = dto.requestedRefundAmount ??
            hr.actualRefundAmount ??
            hr.userAmount ??
            serverComputedAmount;
        let requestedRefundAmount = serverComputedAmount;
        if (Math.abs(Number(claimedAmount) - serverComputedAmount) > 0.01) {
            this.logger.warn(`[RefundRequest] Client-submitted refund amount (${claimedAmount}) differs from server-computed amount (${serverComputedAmount}) for era ${hr.era}/${hr.transactionReference} — using server-computed value.`);
        }
        const refundCaseId = await this.resolveRefundCaseId(dto, user);
        const refundRequest = this.refundRequestRepo.create({
            msisdn: dto.msisdn,
            refundCaseId,
            era: hr.era,
            tableName: hr.tableName,
            transactionReference: hr.transactionReference,
            orderId: hr.orderId || null,
            paymentOrderId: hr.paymentOrderId || null,
            paymentMethod: hr.paymentMethod || null,
            packageName: hr.packageName || null,
            amountDeducted,
            loanAmount,
            userAmount: hr.userAmount != null ? Number(hr.userAmount) : serverComputedAmount,
            isPartialRefund: !!hr.isPartialRefund,
            requestedRefundAmount,
            paymentStatus: hr.paymentStatus || null,
            packagePosted: hr.packagePosted || null,
            fulfillmentStatus: hr.fulfillmentStatus || null,
            errorMessage: hr.errorMessage || null,
            fulfillmentMessage: hr.fulfillmentMessage || null,
            refundEligibility: hr.refundEligibility || null,
            sourceTimestamp: hr.timestamp ? new Date(hr.timestamp) : null,
            mobileNumber: hr.mobileNumber || null,
            walletNumber: hr.walletNumber || null,
            inquirySnapshot: hr.inquiry || null,
            requestReason: dto.requestReason || null,
            isOverride: !!dto.isOverride,
            overrideJustification: dto.overrideJustification || null,
            requiresOverrideApproval,
            status: refund_request_entity_1.RefundRequestStatus.SUBMITTED,
            requestedByUserId: user.id,
            requestedBy: user.username,
        });
        await this.refundRequestRepo.save(refundRequest);
        this.logger.log(`[RefundRequest] Created #${refundRequest.id} for MSISDN ${dto.msisdn} (era ${hr.era}, ref ${hr.transactionReference}) by ${user.username}`);
        this.notificationsService.notify(dto.msisdn, "Refund Request Received", `We've received your refund request for Rs. ${requestedRefundAmount.toLocaleString()} and it's under review.`, "INFO", { requestId: String(refundRequest.id), amount: String(requestedRefundAmount) });
        return refundRequest;
    }
    async findAll(query, currentUser) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.msisdn)
            where.msisdn = query.msisdn;
        const scope = query.scope || 'all';
        if (scope === 'all') {
            if (!currentUser || !currentUser.permissions.has('refund_requests.read_all')) {
                throw new common_1.ForbiddenException('Only administrators can access the full refund requests queue');
            }
        }
        else if (scope === 'pending') {
            if (!currentUser || !currentUser.permissions.has('refund_requests.review')) {
                throw new common_1.ForbiddenException('Only reviewers and administrators can access the pending review queue');
            }
            if (!query.status) {
                where.status = (0, typeorm_2.In)([
                    refund_request_entity_1.RefundRequestStatus.SUBMITTED,
                    refund_request_entity_1.RefundRequestStatus.UNDER_REVIEW,
                    refund_request_entity_1.RefundRequestStatus.FAILED,
                ]);
            }
        }
        else if (scope === 'mine' && currentUser) {
            where.requestedByUserId = currentUser.id;
        }
        if (query.inquiryConfirmedPaid === 'true') {
            const qb = this.refundRequestRepo
                .createQueryBuilder('r')
                .where(where)
                .andWhere("LOWER(r.paymentStatus) NOT IN ('success', 'completed', 'paid', 'verified')")
                .andWhere("JSON_UNQUOTE(JSON_EXTRACT(r.inquirySnapshot, '$.status')) LIKE '%Confirmed Paid%'")
                .orderBy('r.createdAt', 'DESC')
                .skip(skip)
                .take(limit);
            const [data, total] = await qb.getManyAndCount();
            return { data, total, page, limit };
        }
        const [data, total] = await this.refundRequestRepo.findAndCount({
            where,
            skip,
            take: limit,
            order: { createdAt: "DESC" },
        });
        return { data, total, page, limit };
    }
    async findOne(id) {
        const refundRequest = await this.refundRequestRepo.findOne({
            where: { id },
            relations: ["requestedByUser", "reviewedByUser", "approvedByUser"],
        });
        if (!refundRequest) {
            throw new common_1.NotFoundException(`Refund request with ID ${id} not found`);
        }
        return refundRequest;
    }
    async review(id, dto, user) {
        const refundRequest = await this.refundRequestRepo.findOne({ where: { id } });
        if (!refundRequest) {
            throw new common_1.NotFoundException(`Refund request with ID ${id} not found`);
        }
        const isRetry = refundRequest.status === refund_request_entity_1.RefundRequestStatus.FAILED &&
            dto.decision === "approve";
        if (!isRetry &&
            refundRequest.status !== refund_request_entity_1.RefundRequestStatus.SUBMITTED &&
            refundRequest.status !== refund_request_entity_1.RefundRequestStatus.UNDER_REVIEW) {
            throw new common_1.BadRequestException(`Refund request #${id} is already in status "${refundRequest.status}" and cannot be reviewed again.`);
        }
        if (refundRequest.requiresOverrideApproval && !user.permissions.has('refund_requests.override_approve')) {
            throw new common_1.ForbiddenException("This request required an override — only an admin can review it.");
        }
        refundRequest.reviewedByUserId = user.id;
        refundRequest.reviewedBy = user.username;
        refundRequest.reviewedAt = new Date();
        refundRequest.reviewComment = dto.comment || null;
        if (dto.decision === "reject") {
            refundRequest.status = refund_request_entity_1.RefundRequestStatus.REJECTED;
            await this.refundRequestRepo.save(refundRequest);
            this.logger.log(`[RefundRequest] #${id} rejected by ${user.username}`);
            this.notificationsService.notify(refundRequest.msisdn, "Refund Request Rejected", `Your refund request${dto.comment ? ` was rejected: ${dto.comment}` : " has been rejected."}`, "WARNING", { requestId: String(id) });
            return { requestId: id, status: refund_request_entity_1.RefundRequestStatus.REJECTED, queued: false };
        }
        refundRequest.approvedByUserId = user.id;
        refundRequest.approvedBy = user.username;
        refundRequest.approvedAt = new Date();
        refundRequest.status = refund_request_entity_1.RefundRequestStatus.PROCESSING;
        await this.refundRequestRepo.save(refundRequest);
        await this.refundQueue.add('process-single-refund', { requestId: id, bulkOperationId: null }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        this.logger.log(`[RefundRequest] #${id} approved by ${user.username} — queued for background processing`);
        return { requestId: id, status: refund_request_entity_1.RefundRequestStatus.PROCESSING, queued: true };
    }
    async bulkReview(ids, decision, comment, user) {
        if (decision === 'reject') {
            const targets = await this.refundRequestRepo.find({
                where: { id: (0, typeorm_2.In)(ids) },
                select: { id: true, msisdn: true },
            });
            await this.refundRequestRepo
                .createQueryBuilder()
                .update(refund_request_entity_1.RefundRequest)
                .set({
                status: refund_request_entity_1.RefundRequestStatus.REJECTED,
                reviewedByUserId: user.id,
                reviewedBy: user.username,
                reviewedAt: new Date(),
                reviewComment: comment || null,
            })
                .whereInIds(ids)
                .execute();
            this.logger.log(`[BulkReview] ${ids.length} requests rejected by ${user.username}`);
            for (const target of targets) {
                this.notificationsService.notify(target.msisdn, "Refund Request Rejected", `Your refund request${comment ? ` was rejected: ${comment}` : " has been rejected."}`, "WARNING", { requestId: String(target.id) });
            }
            return { bulkOperationId: null, total: ids.length, queued: 0, rejected: ids.length };
        }
        const bulkOperation = await this.dataSource.transaction(async (manager) => {
            const bulkOp = manager.create(bulk_operation_entity_1.BulkOperation, {
                operationNumber: `BULK-${Date.now()}`,
                totalCases: ids.length,
                processedCases: 0,
                successfulRefunds: 0,
                failedRefunds: 0,
                status: bulk_operation_entity_1.BulkOperationStatus.PROCESSING,
                createdBy: user.username,
            });
            const savedBulkOp = await manager.save(bulk_operation_entity_1.BulkOperation, bulkOp);
            await manager
                .createQueryBuilder()
                .update(refund_request_entity_1.RefundRequest)
                .set({
                status: refund_request_entity_1.RefundRequestStatus.PROCESSING,
                bulkOperationId: savedBulkOp.id,
                approvedByUserId: user.id,
                approvedBy: user.username,
                approvedAt: new Date(),
                reviewedByUserId: user.id,
                reviewedBy: user.username,
                reviewedAt: new Date(),
                reviewComment: comment || null,
            })
                .whereInIds(ids)
                .execute();
            return savedBulkOp;
        });
        const jobs = ids.map((requestId) => ({
            name: 'process-single-refund',
            data: { requestId, bulkOperationId: bulkOperation.id },
            opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        }));
        await this.refundQueue.addBulk(jobs);
        this.logger.log(`[BulkReview] Bulk operation #${bulkOperation.id} created — ${ids.length} jobs queued by ${user.username}`);
        return {
            bulkOperationId: bulkOperation.id,
            total: ids.length,
            queued: ids.length,
            rejected: 0,
        };
    }
    async bulkCreateAndRefund(records, user, autoApprove) {
        const errors = [];
        const valid = [];
        const seenRefs = new Set();
        for (const record of records) {
            const hr = record.historyRecord;
            const txnRef = hr?.transactionReference || 'unknown';
            if (hr?.era == null || !hr?.transactionReference || hr?.amountDeducted == null) {
                errors.push(`${txnRef}: historyRecord must include at least era, transactionReference, and amountDeducted`);
                continue;
            }
            if (hr.refundEligibility !== 'Eligible') {
                if (!record.isOverride) {
                    errors.push(`${txnRef}: not eligible for refund (refundEligibility=${hr.refundEligibility ?? 'unknown'}) — resubmit with isOverride=true`);
                    continue;
                }
                if (!record.overrideJustification || !record.overrideJustification.trim()) {
                    errors.push(`${txnRef}: overrideJustification is required when isOverride is true`);
                    continue;
                }
            }
            if (seenRefs.has(txnRef)) {
                errors.push(`${txnRef}: duplicate transactionReference within this batch`);
                continue;
            }
            seenRefs.add(txnRef);
            valid.push({ record, txnRef });
        }
        const createdIds = [];
        if (valid.length > 0) {
            await this.dataSource.transaction(async (manager) => {
                const existing = await manager.find(refund_request_entity_1.RefundRequest, {
                    where: { transactionReference: (0, typeorm_2.In)(valid.map((v) => v.txnRef)) },
                    select: { transactionReference: true },
                });
                const existingRefs = new Set(existing.map((r) => r.transactionReference));
                const caseIdByTxnRef = await this.resolveRefundCaseIdsBatch(manager, valid.map((v) => v.record), user);
                const entities = [];
                for (const { record, txnRef } of valid) {
                    if (existingRefs.has(txnRef)) {
                        errors.push(`${txnRef}: a refund request already exists for this transaction`);
                        continue;
                    }
                    const hr = record.historyRecord;
                    const isEligible = hr.refundEligibility === 'Eligible';
                    const loanAmount = Number(hr.loanAmount ?? 0);
                    const amountDeducted = Number(hr.amountDeducted);
                    const requestedRefundAmount = Math.max(amountDeducted - loanAmount, 0);
                    entities.push({
                        msisdn: record.msisdn,
                        refundCaseId: caseIdByTxnRef.get(txnRef) ?? null,
                        era: hr.era,
                        tableName: hr.tableName,
                        transactionReference: hr.transactionReference,
                        orderId: hr.orderId || null,
                        paymentOrderId: hr.paymentOrderId || null,
                        paymentMethod: hr.paymentMethod || null,
                        packageName: hr.packageName || null,
                        amountDeducted,
                        loanAmount,
                        userAmount: hr.userAmount != null ? Number(hr.userAmount) : requestedRefundAmount,
                        isPartialRefund: !!hr.isPartialRefund,
                        requestedRefundAmount,
                        paymentStatus: hr.paymentStatus || null,
                        packagePosted: hr.packagePosted || null,
                        fulfillmentStatus: hr.fulfillmentStatus || null,
                        errorMessage: hr.errorMessage || null,
                        fulfillmentMessage: hr.fulfillmentMessage || null,
                        refundEligibility: hr.refundEligibility || null,
                        sourceTimestamp: hr.timestamp ? new Date(hr.timestamp) : null,
                        mobileNumber: hr.mobileNumber || null,
                        walletNumber: hr.walletNumber || null,
                        inquirySnapshot: hr.inquiry || null,
                        requestReason: record.requestReason || null,
                        isOverride: !!record.isOverride,
                        overrideJustification: record.overrideJustification || null,
                        requiresOverrideApproval: !isEligible,
                        status: refund_request_entity_1.RefundRequestStatus.SUBMITTED,
                        requestedByUserId: user.id,
                        requestedBy: user.username,
                    });
                }
                if (entities.length > 0) {
                    const insertResult = await manager.insert(refund_request_entity_1.RefundRequest, entities);
                    for (const row of insertResult.identifiers) {
                        createdIds.push(row.id);
                    }
                    this.logger.log(`[BulkCreateAndRefund] Inserted ${entities.length} requests in a single round-trip for ${user.username}`);
                    entities.forEach((entity, i) => {
                        const id = insertResult.identifiers[i]?.id;
                        if (!entity.msisdn || !id)
                            return;
                        this.notificationsService.notify(entity.msisdn, "Refund Request Received", `We've received your refund request for Rs. ${Number(entity.requestedRefundAmount).toLocaleString()} and it's under review.`, "INFO", { requestId: String(id), amount: String(entity.requestedRefundAmount) });
                    });
                }
            });
        }
        if (createdIds.length === 0 || !autoApprove) {
            this.logger.log(`[BulkCreateAndRefund] ${createdIds.length} requests created (not queued — autoApprove=${autoApprove})`);
            return { bulkOperationId: null, total: records.length, created: createdIds.length, queued: 0, errors };
        }
        const bulkResult = await this.bulkReview(createdIds, 'approve', 'Bulk auto-approved', user);
        this.logger.log(`[BulkCreateAndRefund] ${createdIds.length} created, ${bulkResult.queued} queued for refund by ${user.username}`);
        return {
            bulkOperationId: bulkResult.bulkOperationId,
            total: records.length,
            created: createdIds.length,
            queued: bulkResult.queued,
            errors,
        };
    }
};
exports.RefundRequestsService = RefundRequestsService;
exports.RefundRequestsService = RefundRequestsService = RefundRequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(refund_request_entity_1.RefundRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(refund_case_entity_1.RefundCase)),
    __param(2, (0, typeorm_1.InjectRepository)(bulk_operation_entity_1.BulkOperation)),
    __param(5, (0, bull_1.InjectQueue)('refund-queue')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        refund_processing_service_1.RefundProcessingService,
        typeorm_2.DataSource, Object, notifications_service_1.NotificationsService])
], RefundRequestsService);
//# sourceMappingURL=refund-requests.service.js.map