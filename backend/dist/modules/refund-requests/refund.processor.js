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
var RefundProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const refund_request_entity_1 = require("../../entities/refund-request.entity");
const bulk_operation_entity_1 = require("../../entities/bulk-operation.entity");
const bulk_operation_log_entity_1 = require("../../entities/bulk-operation-log.entity");
const refund_processing_service_1 = require("../refund-processing/refund-processing.service");
const notifications_service_1 = require("../notifications/notifications.service");
let RefundProcessor = RefundProcessor_1 = class RefundProcessor {
    constructor(refundRequestRepo, bulkOperationRepo, bulkOperationLogRepo, refundProcessingService, notificationsService) {
        this.refundRequestRepo = refundRequestRepo;
        this.bulkOperationRepo = bulkOperationRepo;
        this.bulkOperationLogRepo = bulkOperationLogRepo;
        this.refundProcessingService = refundProcessingService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(RefundProcessor_1.name);
    }
    async handleRefundJob(job) {
        const { requestId, bulkOperationId } = job.data;
        this.logger.log(`[Worker] Processing refund request #${requestId}${bulkOperationId ? ` (batch #${bulkOperationId})` : ''}`);
        const refundRequest = await this.refundRequestRepo.findOne({
            where: { id: requestId },
        });
        if (!refundRequest) {
            this.logger.error(`[Worker] RefundRequest #${requestId} not found — skipping.`);
            return;
        }
        if (refundRequest.status === refund_request_entity_1.RefundRequestStatus.REFUNDED ||
            refundRequest.status === refund_request_entity_1.RefundRequestStatus.FAILED) {
            this.logger.warn(`[Worker] RefundRequest #${requestId} already has status "${refundRequest.status}" — skipping duplicate job.`);
            return;
        }
        let isSuccess = false;
        if (bulkOperationId) {
            const gatewayMethod = normalizePaymentMethodForGateway(refundRequest.paymentMethod);
            const amount = Number(refundRequest.requestedRefundAmount);
            const ref = refundRequest.transactionReference || String(refundRequest.id);
            await this.bulkOperationRepo.update(bulkOperationId, {
                currentlyProcessingRef: ref,
            });
            await this.addLog(bulkOperationId, `🔄 Processing request #${refundRequest.id} (Ref: ${ref}, Rs. ${amount.toLocaleString()}) via ${gatewayMethod}...`);
        }
        try {
            const gatewayMethod = normalizePaymentMethodForGateway(refundRequest.paymentMethod);
            const result = await this.refundProcessingService.processRefund(gatewayMethod, {
                orderId: refundRequest.transactionReference,
                amount: Number(refundRequest.requestedRefundAmount),
                msisdn: refundRequest.msisdn,
                accountNumber: refundRequest.walletNumber,
                orderDate: refundRequest.sourceTimestamp || new Date(),
            });
            isSuccess = result.success;
            refundRequest.status = result.success
                ? refund_request_entity_1.RefundRequestStatus.REFUNDED
                : refund_request_entity_1.RefundRequestStatus.FAILED;
            refundRequest.refundProcessedAt = new Date();
            refundRequest.refundGatewayResponse = result.rawResponse || { description: result.description };
            if (bulkOperationId) {
                if (isSuccess) {
                    await this.addLog(bulkOperationId, `✅ Refunded request #${refundRequest.id} successfully.`);
                }
                else {
                    await this.addLog(bulkOperationId, `❌ Failed request #${refundRequest.id}: ${result.description || 'Gateway error'}`);
                }
            }
            this.logger.log(`[Worker] RefundRequest #${requestId} → ${refundRequest.status}`);
        }
        catch (error) {
            this.logger.error(`[Worker] RefundRequest #${requestId} threw: ${error.message}`);
            isSuccess = false;
            refundRequest.status = refund_request_entity_1.RefundRequestStatus.FAILED;
            refundRequest.refundProcessedAt = new Date();
            refundRequest.refundGatewayResponse = { error: error.message };
            if (bulkOperationId) {
                await this.addLog(bulkOperationId, `❌ Failed request #${refundRequest.id} with exception: ${error.message}`);
            }
        }
        await this.refundRequestRepo.save(refundRequest);
        if (isSuccess) {
            this.notificationsService.notify(refundRequest.msisdn, "Refund Processed", `Your refund of Rs. ${Number(refundRequest.requestedRefundAmount).toLocaleString()} has been processed successfully.`, "SUCCESS", { requestId: String(refundRequest.id), amount: String(refundRequest.requestedRefundAmount) });
        }
        if (bulkOperationId) {
            await this.updateBulkOperationProgress(bulkOperationId, isSuccess);
        }
    }
    async updateBulkOperationProgress(bulkOperationId, isSuccess) {
        await this.bulkOperationRepo
            .createQueryBuilder()
            .update(bulk_operation_entity_1.BulkOperation)
            .set({
            processedCases: () => 'processed_cases + 1',
            successfulRefunds: () => isSuccess ? 'successful_refunds + 1' : 'successful_refunds',
            failedRefunds: () => !isSuccess ? 'failed_refunds + 1' : 'failed_refunds',
        })
            .where('id = :id', { id: bulkOperationId })
            .execute();
        const updated = await this.bulkOperationRepo.findOne({
            where: { id: bulkOperationId },
        });
        if (updated) {
            updated.progressPercentage = Math.min(100, Math.round((updated.processedCases / updated.totalCases) * 10000) / 100);
            if (updated.processedCases >= updated.totalCases) {
                updated.status = bulk_operation_entity_1.BulkOperationStatus.COMPLETED;
                updated.completedAt = new Date();
                updated.currentlyProcessingRef = null;
                this.logger.log(`[Worker] Bulk operation #${bulkOperationId} COMPLETED — ${updated.successfulRefunds} succeeded, ${updated.failedRefunds} failed.`);
                await this.addLog(bulkOperationId, `🎉 Bulk operation completed. ${updated.successfulRefunds} succeeded, ${updated.failedRefunds} failed.`);
            }
            await this.bulkOperationRepo.save(updated);
        }
    }
    async addLog(bulkOperationId, message) {
        try {
            await this.bulkOperationLogRepo.save({
                bulkOperationId,
                message,
            });
        }
        catch (err) {
            this.logger.error(`[Worker] Failed to write log for batch #${bulkOperationId}: ${err.message}`);
        }
    }
};
exports.RefundProcessor = RefundProcessor;
__decorate([
    (0, bull_1.Process)('process-single-refund'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RefundProcessor.prototype, "handleRefundJob", null);
exports.RefundProcessor = RefundProcessor = RefundProcessor_1 = __decorate([
    (0, bull_1.Processor)('refund-queue'),
    __param(0, (0, typeorm_1.InjectRepository)(refund_request_entity_1.RefundRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(bulk_operation_entity_1.BulkOperation)),
    __param(2, (0, typeorm_1.InjectRepository)(bulk_operation_log_entity_1.BulkOperationLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        refund_processing_service_1.RefundProcessingService,
        notifications_service_1.NotificationsService])
], RefundProcessor);
function normalizePaymentMethodForGateway(raw) {
    const key = (raw || '').toUpperCase().replace(/_/g, '');
    if (key === 'JAZZCASH')
        return 'Jazz_Cash';
    if (key === 'CARD')
        return 'Card';
    return 'Easy_Paisa';
}
//# sourceMappingURL=refund.processor.js.map