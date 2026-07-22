import { Repository } from 'typeorm';
import { RefundCase } from '../../entities/refund-case.entity';
import { CreateRefundCaseDto } from './dto/create-refund-case.dto';
import { QueryRefundCasesDto } from './dto/query-refund-cases.dto';
import { VerificationService } from '../verification/verification.service';
import { RefundProcessingService } from '../refund-processing/refund-processing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class RefundCasesService {
    private readonly refundCaseRepo;
    private readonly verificationService;
    private readonly refundProcessingService;
    private readonly auditLogsService;
    private readonly logger;
    constructor(refundCaseRepo: Repository<RefundCase>, verificationService: VerificationService, refundProcessingService: RefundProcessingService, auditLogsService: AuditLogsService);
    create(createDto: CreateRefundCaseDto, userContext?: any, bulkOperationId?: number): Promise<RefundCase>;
    verifyCase(id: number, userContext?: any): Promise<RefundCase>;
    processRefund(id: number, userContext?: any): Promise<RefundCase>;
    findAll(queryDto: QueryRefundCasesDto): Promise<{
        data: RefundCase[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<RefundCase>;
    findAllByMsisdn(msisdn: string): Promise<RefundCase[]>;
    findByCaseNumber(caseNumber: string): Promise<RefundCase>;
    findByBulkOperationId(bulkOperationId: number): Promise<RefundCase[]>;
    private generateCaseNumber;
    private normalizeMsisdn;
}
