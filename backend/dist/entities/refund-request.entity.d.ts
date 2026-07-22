import { RefundCase } from './refund-case.entity';
import { User } from './user.entity';
import { BulkOperation } from './bulk-operation.entity';
export declare enum RefundRequestStatus {
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    PROCESSING = "processing",
    REFUNDED = "refunded",
    FAILED = "failed"
}
export declare class RefundRequest {
    id: number;
    refundCase: RefundCase;
    refundCaseId: number;
    msisdn: string;
    era: number;
    tableName: string;
    transactionReference: string;
    orderId: string;
    paymentOrderId: string;
    paymentMethod: string;
    packageName: string;
    amountDeducted: number;
    loanAmount: number;
    userAmount: number;
    isPartialRefund: boolean;
    requestedRefundAmount: number;
    paymentStatus: string;
    packagePosted: string;
    fulfillmentStatus: string;
    errorMessage: string;
    fulfillmentMessage: string;
    refundEligibility: string;
    sourceTimestamp: Date;
    mobileNumber: string;
    walletNumber: string;
    inquirySnapshot: any;
    requestReason: string;
    isOverride: boolean;
    overrideJustification: string;
    requiresOverrideApproval: boolean;
    status: RefundRequestStatus;
    requestedByUser: User;
    requestedByUserId: number;
    requestedBy: string;
    reviewedByUser: User;
    reviewedByUserId: number;
    reviewedBy: string;
    reviewedAt: Date;
    reviewComment: string;
    approvedByUser: User;
    approvedByUserId: number;
    approvedBy: string;
    approvedAt: Date;
    refundProcessedAt: Date;
    refundGatewayResponse: any;
    bulkOperationId: number;
    bulkOperation: BulkOperation;
    createdAt: Date;
    updatedAt: Date;
}
