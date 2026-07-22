import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundAuditLog } from '../../entities/refund-audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(RefundAuditLog)
    private readonly auditLogRepo: Repository<RefundAuditLog>,
  ) {}

  async log(data: {
    refundCaseId: number;
    action: string;
    oldValue?: any;
    newValue?: any;
    description?: string;
    performedBy: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RefundAuditLog> {
    const logEntry = this.auditLogRepo.create(data);
    return this.auditLogRepo.save(logEntry);
  }

  async findByCaseId(refundCaseId: number): Promise<RefundAuditLog[]> {
    return this.auditLogRepo.find({
      where: { refundCaseId },
      order: { performedAt: 'DESC' },
    });
  }
}
