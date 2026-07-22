import { RefundRequestsService } from './refund-requests.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ReviewRefundRequestDto } from './dto/review-refund-request.dto';
import { QueryRefundRequestsDto } from './dto/query-refund-requests.dto';
import { BulkReviewRefundRequestsDto } from './dto/bulk-review-refund-requests.dto';
import { BulkCreateAndRefundDto } from './dto/bulk-create-and-refund.dto';
export declare class RefundRequestsController {
    private readonly refundRequestsService;
    constructor(refundRequestsService: RefundRequestsService);
    create(dto: CreateRefundRequestDto, user: any): Promise<import("../../entities/refund-request.entity").RefundRequest>;
    findAll(query: QueryRefundRequestsDto, user: any): Promise<{
        data: import("../../entities/refund-request.entity").RefundRequest[];
        total: number;
        page: number;
        limit: number;
    }>;
    bulkReview(dto: BulkReviewRefundRequestsDto, user: any): Promise<{
        bulkOperationId: number | null;
        total: number;
        queued: number;
        rejected: number;
    }>;
    bulkCreateAndRefund(body: BulkCreateAndRefundDto, user: any): Promise<{
        bulkOperationId: number | null;
        total: number;
        created: number;
        queued: number;
        errors: string[];
    }>;
    findOne(id: string): Promise<import("../../entities/refund-request.entity").RefundRequest>;
    review(id: string, dto: ReviewRefundRequestDto, user: any): Promise<{
        requestId: number;
        status: string;
        queued: boolean;
    }>;
}
