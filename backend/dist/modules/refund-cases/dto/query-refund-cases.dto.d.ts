import { RefundCaseStatus, VerificationResult, RefundStatus, PaymentMethod } from '../../../entities/refund-case.entity';
export declare class QueryRefundCasesDto {
    page?: string;
    limit?: string;
    status?: RefundCaseStatus;
    verificationResult?: VerificationResult;
    refundStatus?: RefundStatus;
    paymentMethod?: PaymentMethod;
    search?: string;
    msisdn?: string;
    startDate?: string;
    endDate?: string;
}
