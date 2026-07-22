import { RefundAuditLog } from './refund-audit-log.entity';
import { RefundNotification } from './refund-notification.entity';
import { BulkOperation } from './bulk-operation.entity';
export declare enum RefundCaseStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    REJECTED = "rejected",
    PROCESSING = "processing",
    REFUNDED = "refunded",
    FAILED = "failed"
}
export declare enum VerificationResult {
    APPROVED = "approved",
    REJECTED = "rejected",
    NOT_FOUND = "not_found"
}
export declare enum RefundStatus {
    NOT_PROCESSED = "not_processed",
    SUCCESS = "success",
    FAILED = "failed",
    PENDING = "pending"
}
export declare enum PaymentMethod {
    EASY_PAISA = "Easy_Paisa",
    JAZZ_CASH = "Jazz_Cash",
    CARD = "Card"
}
export declare class RefundCase {
    id: number;
    caseNumber: string;
    msisdn: string;
    amount: number;
    paymentMethod: PaymentMethod;
    accountNumber: string;
    packageCode: string;
    orderId: string;
    transactionDatetime: Date;
    sourceTransactionId: number;
    sourceSnapshot: any;
    status: RefundCaseStatus;
    verificationResult: VerificationResult;
    verificationComment: string;
    eligibilityChecks: any;
    verifiedAt: Date;
    verifiedBy: string;
    refundStatus: RefundStatus;
    refundDescription: string;
    refundRawResponse: string;
    refundProcessedAt: Date;
    refundProcessedBy: string;
    bulkOperationId: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    auditLogs: RefundAuditLog[];
    notifications: RefundNotification[];
    bulkOperation: BulkOperation;
}
