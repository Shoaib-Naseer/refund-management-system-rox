import { DataSource, Repository } from "typeorm";
import { RefundRequest } from "../../entities/refund-request.entity";
export interface EligibleRecord {
    era: 2 | 3;
    subscriptionType: "Old Subscription" | "New Subscription";
    transactionReference: string;
    orderId: string;
    paymentOrderId?: string;
    paymentMethod: string | null;
    serviceCode: string | null;
    mobileNumber: string;
    walletNumber: string | null;
    amountDeducted: number;
    loanAmount: number;
    userAmount: number;
    actualRefundAmount: number;
    isPartialRefund: boolean;
    paymentStatus: string;
    fulfillmentStatus: string;
    errorMessage: string | null;
    fulfillmentMessage?: string | null;
    timestamp: string;
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
export interface EligibleFilters {
    dateFrom?: string;
    dateTo?: string;
    refundedAtFrom?: string;
    refundedAtTo?: string;
    paymentMethod?: string;
    packageName?: string;
    refundStatus?: string;
    page: number;
    limit: number;
}
export interface PaginatedEligible {
    data: EligibleRecord[];
    total: number;
    page: number;
    limit: number;
}
export declare class SubscriptionsService {
    private readonly sourceDataSource;
    private readonly refundRequestRepo;
    private readonly logger;
    constructor(sourceDataSource: DataSource, refundRequestRepo: Repository<RefundRequest>);
    getEligibleOldSubscriptions(filters: EligibleFilters, excludeSuccess?: boolean): Promise<PaginatedEligible>;
    getEligibleNewSubscriptions(filters: EligibleFilters, excludeSuccess?: boolean): Promise<PaginatedEligible>;
    private batchFetchWallets;
    private getRefundRefsForFilter;
    private attachRefundStatus;
    getProcessedSubscriptions(filters: EligibleFilters, eraFilter?: number): Promise<PaginatedEligible>;
    getEligibleAllSubscriptions(filters: EligibleFilters, excludeSuccess?: boolean): Promise<PaginatedEligible>;
}
