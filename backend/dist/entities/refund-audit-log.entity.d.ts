import { RefundCase } from './refund-case.entity';
export declare class RefundAuditLog {
    id: number;
    refundCaseId: number;
    action: string;
    oldValue: any;
    newValue: any;
    description: string;
    performedBy: string;
    ipAddress: string;
    userAgent: string;
    performedAt: Date;
    refundCase: RefundCase;
}
