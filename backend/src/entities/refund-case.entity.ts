import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RefundAuditLog } from './refund-audit-log.entity';
import { RefundNotification } from './refund-notification.entity';
import { BulkOperation } from './bulk-operation.entity';

export enum RefundCaseStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum VerificationResult {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_FOUND = 'not_found',
}

export enum RefundStatus {
  NOT_PROCESSED = 'not_processed',
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum PaymentMethod {
  EASY_PAISA = 'Easy_Paisa',
  JAZZ_CASH = 'Jazz_Cash',
  CARD = 'Card',
  JAZZ_BALANCE = 'Jazz_Balance',
  DUAL = 'DUAL',
}

@Entity('refund_cases')
@Index(['msisdn'])
@Index(['orderId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['bulkOperationId'])
export class RefundCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'case_number', type: 'varchar', length: 50, unique: true })
  caseNumber: string;

  // Customer Info
  @Column({ type: 'varchar', length: 15 })
  msisdn: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_mode', type: 'varchar', length: 50, nullable: true, default: '3pp' })
  paymentMode: string;

  @Column({ name: 'balance_charge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  balanceChargeAmount: number;

  @Column({ name: 'external_charge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  externalChargeAmount: number;

  @Column({ name: 'account_number', type: 'varchar', length: 255, nullable: true })
  accountNumber: string;

  @Column({ name: 'package_code', type: 'varchar', length: 100, nullable: true })
  packageCode: string;

  @Column({ name: 'order_id', type: 'varchar', length: 255, nullable: true })
  orderId: string;

  @Column({
    name: 'transaction_datetime',
    type: 'datetime',
    nullable: true,
  })
  transactionDatetime: Date;

  // Source Record Reference
  @Column({
    name: 'source_transaction_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  sourceTransactionId: number;

  @Column({ name: 'source_snapshot', type: 'json', nullable: true })
  sourceSnapshot: any;

  // Verification
  @Column({
    type: 'simple-enum',
    enum: RefundCaseStatus,
    default: RefundCaseStatus.PENDING,
  })
  status: RefundCaseStatus;

  @Column({
    name: 'verification_result',
    type: 'simple-enum',
    enum: VerificationResult,
    nullable: true,
  })
  verificationResult: VerificationResult;

  @Column({ name: 'verification_comment', type: 'text', nullable: true })
  verificationComment: string;

  @Column({ name: 'eligibility_checks', type: 'json', nullable: true })
  eligibilityChecks: any;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt: Date;

  @Column({ name: 'verified_by', type: 'varchar', length: 100, nullable: true })
  verifiedBy: string;

  // Refund Processing
  @Column({
    name: 'refund_status',
    type: 'simple-enum',
    enum: RefundStatus,
    default: RefundStatus.NOT_PROCESSED,
  })
  refundStatus: RefundStatus;

  @Column({ name: 'refund_description', type: 'text', nullable: true })
  refundDescription: string;

  @Column({ name: 'refund_raw_response', type: 'text', nullable: true })
  refundRawResponse: string;

  @Column({
    name: 'refund_processed_at',
    type: 'datetime',
    nullable: true,
  })
  refundProcessedAt: Date;

  @Column({
    name: 'refund_processed_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  refundProcessedBy: string;

  // Bulk Operation Reference
  @Column({
    name: 'bulk_operation_id',
    type: 'int',
    nullable: true,
  })
  bulkOperationId: number;

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  // Relations
  @OneToMany(() => RefundAuditLog, (log) => log.refundCase)
  auditLogs: RefundAuditLog[];

  @OneToMany(() => RefundNotification, (notification) => notification.refundCase)
  notifications: RefundNotification[];

  @ManyToOne(() => BulkOperation, { nullable: true })
  @JoinColumn({ name: 'bulk_operation_id' })
  bulkOperation: BulkOperation;
}
