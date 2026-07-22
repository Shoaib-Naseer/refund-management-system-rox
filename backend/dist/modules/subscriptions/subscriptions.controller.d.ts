import { SubscriptionsService } from './subscriptions.service';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getEligibleOld(dateFrom?: string, dateTo?: string, paymentMethod?: string, packageName?: string, refundStatus?: string, page?: number, limit?: number): Promise<import("./subscriptions.service").PaginatedEligible>;
    getEligibleNew(dateFrom?: string, dateTo?: string, paymentMethod?: string, packageName?: string, refundStatus?: string, page?: number, limit?: number): Promise<import("./subscriptions.service").PaginatedEligible>;
    getEligibleAll(dateFrom?: string, dateTo?: string, paymentMethod?: string, packageName?: string, refundStatus?: string, page?: number, limit?: number): Promise<import("./subscriptions.service").PaginatedEligible>;
    getProcessedOld(dateFrom?: string, dateTo?: string, refundedAtFrom?: string, refundedAtTo?: string, paymentMethod?: string, packageName?: string, page?: number, limit?: number): Promise<import("./subscriptions.service").PaginatedEligible>;
    getProcessedNew(dateFrom?: string, dateTo?: string, refundedAtFrom?: string, refundedAtTo?: string, paymentMethod?: string, packageName?: string, page?: number, limit?: number): Promise<import("./subscriptions.service").PaginatedEligible>;
    getProcessedAll(dateFrom?: string, dateTo?: string, refundedAtFrom?: string, refundedAtTo?: string, paymentMethod?: string, packageName?: string, page?: number, limit?: number): Promise<import("./subscriptions.service").PaginatedEligible>;
}
