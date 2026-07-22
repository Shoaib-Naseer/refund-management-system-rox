import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { RefundRequest, RefundRequestStatus } from '../../entities/refund-request.entity';
import { BulkOperation, BulkOperationStatus } from '../../entities/bulk-operation.entity';
import { BulkOperationLog } from '../../entities/bulk-operation-log.entity';
import { RefundProcessingService } from '../refund-processing/refund-processing.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface RefundJobPayload {
  requestId: number;
  bulkOperationId: number | null; // null for single (non-bulk) approvals
}

@Processor('refund-queue')
export class RefundProcessor {
  private readonly logger = new Logger(RefundProcessor.name);

  constructor(
    @InjectRepository(RefundRequest)
    private readonly refundRequestRepo: Repository<RefundRequest>,
    @InjectRepository(BulkOperation)
    private readonly bulkOperationRepo: Repository<BulkOperation>,
    @InjectRepository(BulkOperationLog)
    private readonly bulkOperationLogRepo: Repository<BulkOperationLog>,
    private readonly refundProcessingService: RefundProcessingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handles a single refund job from the queue.
   * Called for both individual approvals and items inside a bulk batch.
   * BullMQ will retry this job automatically up to 3 times with exponential backoff
   * if an unexpected exception propagates out of this handler.
   */
  @Process('process-single-refund')
  async handleRefundJob(job: Job<RefundJobPayload>): Promise<void> {
    const { requestId, bulkOperationId } = job.data;
    this.logger.log(
      `[Worker] Processing refund request #${requestId}${bulkOperationId ? ` (batch #${bulkOperationId})` : ''}`,
    );

    // Load the request without relations (faster)
    const refundRequest = await this.refundRequestRepo.findOne({
      where: { id: requestId },
    });

    if (!refundRequest) {
      this.logger.error(`[Worker] RefundRequest #${requestId} not found — skipping.`);
      return;
    }

    // Safety guard: skip if already processed (idempotency)
    if (
      refundRequest.status === RefundRequestStatus.REFUNDED ||
      refundRequest.status === RefundRequestStatus.FAILED
    ) {
      this.logger.warn(
        `[Worker] RefundRequest #${requestId} already has status "${refundRequest.status}" — skipping duplicate job.`,
      );
      return;
    }

    let isSuccess = false;

    if (bulkOperationId) {
      const gatewayMethod = normalizePaymentMethodForGateway(refundRequest.paymentMethod);
      const amount = Number(refundRequest.requestedRefundAmount);
      const ref = refundRequest.transactionReference || String(refundRequest.id);
      
      // Update currently processing reference
      await this.bulkOperationRepo.update(bulkOperationId, {
        currentlyProcessingRef: ref,
      });

      await this.addLog(
        bulkOperationId,
        `🔄 Processing request #${refundRequest.id} (Ref: ${ref}, Rs. ${amount.toLocaleString()}) via ${gatewayMethod}...`,
      );
    }

    try {
      // Normalize the payment method and call the gateway
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
        ? RefundRequestStatus.REFUNDED
        : RefundRequestStatus.FAILED;
      refundRequest.refundProcessedAt = new Date();
      refundRequest.refundGatewayResponse = result.rawResponse || { description: result.description };

      if (bulkOperationId) {
        if (isSuccess) {
          await this.addLog(
            bulkOperationId,
            `✅ Refunded request #${refundRequest.id} successfully.`,
          );
        } else {
          await this.addLog(
            bulkOperationId,
            `❌ Failed request #${refundRequest.id}: ${result.description || 'Gateway error'}`,
          );
        }
      }

      this.logger.log(
        `[Worker] RefundRequest #${requestId} → ${refundRequest.status}`,
      );
    } catch (error: any) {
      // Unexpected error — mark as failed and do NOT re-throw, so BullMQ
      // does not retry (gateway-level retries are already handled by
      // executeWithRetry inside RefundProcessingService).
      this.logger.error(`[Worker] RefundRequest #${requestId} threw: ${error.message}`);
      isSuccess = false;
      refundRequest.status = RefundRequestStatus.FAILED;
      refundRequest.refundProcessedAt = new Date();
      refundRequest.refundGatewayResponse = { error: error.message };

      if (bulkOperationId) {
        await this.addLog(
          bulkOperationId,
          `❌ Failed request #${refundRequest.id} with exception: ${error.message}`,
        );
      }
    }

    // Persist the updated request status
    await this.refundRequestRepo.save(refundRequest);

    // Only notify on success — a FAILED attempt may still be retried
    // (bulk-review re-queues, or a reviewer hits "Retry Refund"), so we
    // don't want to alarm the customer over what might be transient.
    if (isSuccess) {
      this.notificationsService.notify(
        refundRequest.msisdn,
        "Refund Processed",
        `Your refund of Rs. ${Number(refundRequest.requestedRefundAmount).toLocaleString()} has been processed successfully.`,
        "SUCCESS",
        { requestId: String(refundRequest.id), amount: String(refundRequest.requestedRefundAmount) },
      );
    }

    // If this job is part of a bulk operation, update the parent batch counters
    if (bulkOperationId) {
      await this.updateBulkOperationProgress(bulkOperationId, isSuccess);
    }
  }

  /**
   * Atomically increments the processed/success/failed counters on the parent
   * BulkOperation record. When all cases are done, marks the batch as completed.
   */
  private async updateBulkOperationProgress(
    bulkOperationId: number,
    isSuccess: boolean,
  ): Promise<void> {
    // Atomic increment to avoid race conditions when multiple workers run in parallel
    await this.bulkOperationRepo
      .createQueryBuilder()
      .update(BulkOperation)
      .set({
        processedCases: () => 'processed_cases + 1',
        successfulRefunds: () => isSuccess ? 'successful_refunds + 1' : 'successful_refunds',
        failedRefunds: () => !isSuccess ? 'failed_refunds + 1' : 'failed_refunds',
      })
      .where('id = :id', { id: bulkOperationId })
      .execute();

    // Reload to check if all cases have been processed, and calculate progress percentage
    const updated = await this.bulkOperationRepo.findOne({
      where: { id: bulkOperationId },
    });

    if (updated) {
      updated.progressPercentage = Math.min(
        100,
        Math.round((updated.processedCases / updated.totalCases) * 10000) / 100,
      );

      if (updated.processedCases >= updated.totalCases) {
        updated.status = BulkOperationStatus.COMPLETED;
        updated.completedAt = new Date();
        updated.currentlyProcessingRef = null;
        this.logger.log(
          `[Worker] Bulk operation #${bulkOperationId} COMPLETED — ${updated.successfulRefunds} succeeded, ${updated.failedRefunds} failed.`,
        );
        await this.addLog(
          bulkOperationId,
          `🎉 Bulk operation completed. ${updated.successfulRefunds} succeeded, ${updated.failedRefunds} failed.`,
        );
      }

      await this.bulkOperationRepo.save(updated);
    }
  }

  private async addLog(bulkOperationId: number, message: string): Promise<void> {
    try {
      await this.bulkOperationLogRepo.save({
        bulkOperationId,
        message,
      });
    } catch (err) {
      this.logger.error(`[Worker] Failed to write log for batch #${bulkOperationId}: ${err.message}`);
    }
  }
}

function normalizePaymentMethodForGateway(raw: string | null): string {
  const key = (raw || '').toUpperCase().replace(/_/g, '');
  if (key === 'JAZZCASH') return 'Jazz_Cash';
  if (key === 'CARD') return 'Card';
  return 'Easy_Paisa';
}
