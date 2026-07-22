import { DataSource, Repository } from "typeorm";
import { RefundRequest } from "../../entities/refund-request.entity";
import { RefundCase } from "../../entities/refund-case.entity";
export interface InquiryInfo {
    triggered: boolean;
    provider: "EasyPaisa" | "JazzCash" | null;
    status: string;
    responseCode?: string;
    responseDesc?: string;
    raw?: any;
}
export interface HistoryRecord {
    era: 3 | 2 | 1;
    tableName: string;
    transactionReference: string;
    orderId: string;
    paymentOrderId?: string;
    paymentMethod?: string;
    packageName: string | null;
    amountDeducted: number;
    paymentStatus: string;
    packagePosted: "Yes" | "No" | "Not Applicable";
    fulfillmentStatus: string;
    errorMessage?: string | null;
    fulfillmentMessage?: string | null;
    refundEligibility: "Eligible" | "Ineligible" | "Not Applicable";
    actualRefundAmount: number;
    isPartialRefund: boolean;
    loanAmount: number;
    userAmount: number;
    timestamp: string;
    mobileNumber?: string;
    walletNumber?: string;
    inquiry: InquiryInfo;
    refundRequestStatus?: string;
    refundRequestId?: number;
    refundPostedBy?: string | null;
    refundReviewedBy?: string | null;
    refundApprovedBy?: string | null;
    refundApiResponse?: string | null;
    requestReason?: string | null;
    overrideJustification?: string | null;
    reviewComment?: string | null;
}
export interface HistoryFilters {
    amount: number | null;
    date: Date | null;
    packageName: string | null;
    includeEra1?: boolean;
    era?: string | null;
}
export declare class HistoryService {
    private readonly sourceDataSource;
    private readonly refundRequestRepo;
    private readonly refundCaseRepo;
    private readonly logger;
    constructor(sourceDataSource: DataSource, refundRequestRepo: Repository<RefundRequest>, refundCaseRepo: Repository<RefundCase>);
    getMsisdnHistory(msisdn: string, filters: HistoryFilters): Promise<HistoryRecord[]>;
    private getFintechEraHistory;
    private getLegacyFulfillmentHistory;
    private getLegacyJourneyHistory;
    private getEra2WalletNumber;
    private resolvePaidStatus;
}
