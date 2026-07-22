import { Repository } from 'typeorm';
import { Job } from 'bull';
import { RefundRequest } from '../../entities/refund-request.entity';
import { BulkOperation } from '../../entities/bulk-operation.entity';
import { BulkOperationLog } from '../../entities/bulk-operation-log.entity';
import { RefundProcessingService } from '../refund-processing/refund-processing.service';
import { NotificationsService } from '../notifications/notifications.service';
export interface RefundJobPayload {
    requestId: number;
    bulkOperationId: number | null;
}
export declare class RefundProcessor {
    private readonly refundRequestRepo;
    private readonly bulkOperationRepo;
    private readonly bulkOperationLogRepo;
    private readonly refundProcessingService;
    private readonly notificationsService;
    private readonly logger;
    constructor(refundRequestRepo: Repository<RefundRequest>, bulkOperationRepo: Repository<BulkOperation>, bulkOperationLogRepo: Repository<BulkOperationLog>, refundProcessingService: RefundProcessingService, notificationsService: NotificationsService);
    handleRefundJob(job: Job<RefundJobPayload>): Promise<void>;
    private updateBulkOperationProgress;
    private addLog;
}
