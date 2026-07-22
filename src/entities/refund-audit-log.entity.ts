import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RefundCase } from './refund-case.entity';

@Entity('refund_audit_logs')
@Index(['refundCaseId'])
@Index(['performedAt'])
@Index(['action'])
export class RefundAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'refund_case_id', type: 'int' })
  refundCaseId: number;

  // Action Details
  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue: any;

  @Column({ name: 'new_value', type: 'json', nullable: true })
  newValue: any;

  @Column({ type: 'text', nullable: true })
  description: string;

  // User Context
  @Column({ name: 'performed_by', type: 'varchar', length: 100 })
  performedBy: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  // Timestamp
  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;

  // Relations
  @ManyToOne(() => RefundCase, (refundCase) => refundCase.auditLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'refund_case_id' })
  refundCase: RefundCase;
}
