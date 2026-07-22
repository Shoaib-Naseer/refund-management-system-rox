import { Repository } from 'typeorm';
import { RefundAuditLog } from '../../entities/refund-audit-log.entity';
export declare class AuditLogsService {
    private readonly auditLogRepo;
    constructor(auditLogRepo: Repository<RefundAuditLog>);
    log(data: {
        refundCaseId: number;
        action: string;
        oldValue?: any;
        newValue?: any;
        description?: string;
        performedBy: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<RefundAuditLog>;
    findByCaseId(refundCaseId: number): Promise<RefundAuditLog[]>;
}
