import { RefundCasesService } from './refund-cases.service';
import { CreateRefundCaseDto } from './dto/create-refund-case.dto';
import { QueryRefundCasesDto } from './dto/query-refund-cases.dto';
export declare class RefundCasesController {
    private readonly refundCasesService;
    constructor(refundCasesService: RefundCasesService);
    create(createDto: CreateRefundCaseDto, req: any): Promise<import("../../entities").RefundCase>;
    findAll(queryDto: QueryRefundCasesDto): Promise<{
        data: import("../../entities").RefundCase[];
        total: number;
        page: number;
        limit: number;
    }>;
    findAllByMsisdn(msisdn: string): Promise<import("../../entities").RefundCase[]>;
    findOne(id: string): Promise<import("../../entities").RefundCase>;
    verifyCase(id: string, req: any): Promise<import("../../entities").RefundCase>;
    processRefund(id: string, req: any): Promise<import("../../entities").RefundCase>;
}
