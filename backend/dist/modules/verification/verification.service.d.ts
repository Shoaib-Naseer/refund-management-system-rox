import { DataSource } from 'typeorm';
export interface VerificationResult {
    era: number;
    paymentId: string;
    orderId?: string;
    amountDeducted: number;
    paymentStatus: string;
    packagePosted: string;
    refundEligibility: string;
    actualRefundAmount: number;
    sourceTable?: string;
    inquiryStatus?: string;
    inquiryRawResponse?: string;
    fulfillmentStatus?: string;
    isPartialRefund?: boolean;
    loanAmount?: number;
    userAmount?: number;
    failureReason?: string;
    timestamp?: string;
}
export declare class VerificationService {
    private readonly sourceDataSource;
    private readonly logger;
    constructor(sourceDataSource: DataSource);
    verifyCase(input: {
        msisdn: string;
        amount: number | null;
        orderId?: string;
        transactionDatetime?: Date;
    }): Promise<{
        result: any;
        comment: string;
        checks: any;
        sourceTransactionId: number | null;
        sourceRecord: any | null;
    }>;
    verifyComplaint(msisdn: string, amount: number | null, date: Date | null): Promise<VerificationResult[]>;
    private verifyFintechEra;
    private verifyLegacyFulfillmentEra;
    private verifyLegacyJourneyEra;
    private resolvePaidStatus;
}
