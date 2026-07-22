import { Repository, DataSource } from "typeorm";
import { Queue } from "bull";
import { RefundRequest } from "../../entities/refund-request.entity";
import { RefundCase } from "../../entities/refund-case.entity";
import { BulkOperation } from "../../entities/bulk-operation.entity";
import { UserRole } from "../../entities/user.entity";
import { RefundProcessingService } from "../refund-processing/refund-processing.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateRefundRequestDto } from "./dto/create-refund-request.dto";
import { ReviewRefundRequestDto } from "./dto/review-refund-request.dto";
import { QueryRefundRequestsDto } from "./dto/query-refund-requests.dto";
export interface AuthenticatedUser {
    id: number;
    username: string;
    role: UserRole;
    permissions: Set<string>;
}
export declare class RefundRequestsService {
    private readonly refundRequestRepo;
    private readonly refundCaseRepo;
    private readonly bulkOperationRepo;
    private readonly refundProcessingService;
    private readonly dataSource;
    private readonly refundQueue;
    private readonly notificationsService;
    private readonly logger;
    constructor(refundRequestRepo: Repository<RefundRequest>, refundCaseRepo: Repository<RefundCase>, bulkOperationRepo: Repository<BulkOperation>, refundProcessingService: RefundProcessingService, dataSource: DataSource, refundQueue: Queue, notificationsService: NotificationsService);
    private resolveRefundCaseId;
    private resolveRefundCaseIdsBatch;
    create(dto: CreateRefundRequestDto, user: AuthenticatedUser): Promise<RefundRequest>;
    findAll(query: QueryRefundRequestsDto, currentUser?: AuthenticatedUser): Promise<{
        data: RefundRequest[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<RefundRequest>;
    review(id: number, dto: ReviewRefundRequestDto, user: AuthenticatedUser): Promise<{
        requestId: number;
        status: string;
        queued: boolean;
    }>;
    bulkReview(ids: number[], decision: 'approve' | 'reject', comment: string | undefined, user: AuthenticatedUser): Promise<{
        bulkOperationId: number | null;
        total: number;
        queued: number;
        rejected: number;
    }>;
    bulkCreateAndRefund(records: CreateRefundRequestDto[], user: AuthenticatedUser, autoApprove: boolean): Promise<{
        bulkOperationId: number | null;
        total: number;
        created: number;
        queued: number;
        errors: string[];
    }>;
}
