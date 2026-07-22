import { Repository } from 'typeorm';
import { Response } from 'express';
import { BulkOperation } from '../../entities/bulk-operation.entity';
import { BulkOperationLog } from '../../entities/bulk-operation-log.entity';
export declare class BulkOperationsController {
    private readonly bulkOperationRepo;
    private readonly bulkOperationLogRepo;
    constructor(bulkOperationRepo: Repository<BulkOperation>, bulkOperationLogRepo: Repository<BulkOperationLog>);
    findOne(id: string): Promise<{
        error: string;
    } | {
        logs: string[];
        id: number;
        operationNumber: string;
        totalCases: number;
        processedCases: number;
        successfulRefunds: number;
        failedRefunds: number;
        status: import("../../entities/bulk-operation.entity").BulkOperationStatus;
        progressPercentage: number;
        errorMessage: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        completedAt: Date;
        currentlyProcessingRef: string;
        refundRequests: import("../../entities/refund-request.entity").RefundRequest[];
        error?: undefined;
    }>;
    streamProgress(id: string, res: Response): Promise<void>;
}
