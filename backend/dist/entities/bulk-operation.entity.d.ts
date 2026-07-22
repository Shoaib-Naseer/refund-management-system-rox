import { RefundRequest } from './refund-request.entity';
export declare enum BulkOperationStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class BulkOperation {
    id: number;
    operationNumber: string;
    totalCases: number;
    processedCases: number;
    successfulRefunds: number;
    failedRefunds: number;
    status: BulkOperationStatus;
    progressPercentage: number;
    errorMessage: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    completedAt: Date;
    currentlyProcessingRef: string;
    logs: string[];
    refundRequests: RefundRequest[];
}
