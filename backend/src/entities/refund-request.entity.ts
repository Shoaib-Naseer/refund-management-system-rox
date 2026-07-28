import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RefundCase } from './refund-case.entity';
import { User } from './user.entity';
import { BulkOperation } from './bulk-operation.entity';

export enum RefundRequestStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

@Entity('refund_requests')
@Index(['msisdn'])
@Index(['era', 'transactionReference'])
@Index(['status'])
export class RefundRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RefundCase, { nullable: true })
  @JoinColumn({ name: 'refund_case_id' })
  refundCase: RefundCase;

  @Column({ name: 'refund_case_id', type: 'int', nullable: true })
  refundCaseId: number;

  @Column({ type: 'varchar', length: 15 })
  msisdn: string;

  // ── Source transaction identity (from the history record the user selected) ──
  @Column({ type: 'tinyint' })
  era: number;

  @Column({ name: 'table_name', type: 'varchar', length: 500 })
  tableName: string;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 255 })
  transactionReference: string;

  @Column({ name: 'order_id', type: 'varchar', length: 255, nullable: true })
  orderId: string;

  @Column({ name: 'payment_order_id', type: 'varchar', length: 255, nullable: true })
  paymentOrderId: string;

  /** Era 2 only — rox_app.subscription_fulfillment_requests.transaction_id (see HistoryRecord.tid). */
  @Column({ name: 'legacy_transaction_id', type: 'varchar', length: 255, nullable: true })
  legacyTransactionId: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_mode', type: 'varchar', length: 50, nullable: true, default: '3pp' })
  paymentMode: string;

  @Column({ name: 'package_name', type: 'varchar', length: 255, nullable: true })
  packageName: string;

  // ── Source transaction financials (frozen at request time) ──
  @Column({ name: 'amount_deducted', type: 'decimal', precision: 10, scale: 2 })
  amountDeducted: number;

  @Column({ name: 'loan_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  loanAmount: number;

  @Column({ name: 'user_amount', type: 'decimal', precision: 10, scale: 2 })
  userAmount: number;

  @Column({ name: 'balance_charge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  balanceChargeAmount: number;

  @Column({ name: 'external_charge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  externalChargeAmount: number;

  @Column({ name: 'is_partial_refund', type: 'boolean', default: false })
  isPartialRefund: boolean;

  @Column({ name: 'requested_refund_amount', type: 'decimal', precision: 10, scale: 2 })
  requestedRefundAmount: number;

  // ── Source transaction status (frozen at request time) ──
  @Column({ name: 'payment_status', type: 'varchar', length: 50, nullable: true })
  paymentStatus: string;

  @Column({ name: 'package_posted', type: 'varchar', length: 20, nullable: true })
  packagePosted: string;

  @Column({ name: 'fulfillment_status', type: 'varchar', length: 255, nullable: true })
  fulfillmentStatus: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'fulfillment_message', type: 'text', nullable: true })
  fulfillmentMessage: string;

  @Column({ name: 'refund_eligibility', type: 'varchar', length: 20, nullable: true })
  refundEligibility: string;

  @Column({ name: 'source_timestamp', type: 'datetime', nullable: true })
  sourceTimestamp: Date;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true })
  mobileNumber: string;

  @Column({ name: 'wallet_number', type: 'varchar', length: 20, nullable: true })
  walletNumber: string;

  @Column({ name: 'inquiry_snapshot', type: 'json', nullable: true })
  inquirySnapshot: any;

  // ── Request / override context ──
  @Column({ name: 'request_reason', type: 'text', nullable: true })
  requestReason: string;

  @Column({ name: 'is_override', type: 'boolean', default: false })
  isOverride: boolean;

  @Column({ name: 'override_justification', type: 'text', nullable: true })
  overrideJustification: string;

  @Column({ name: 'requires_override_approval', type: 'boolean', default: false })
  requiresOverrideApproval: boolean;

  // ── Workflow status ──
  @Column({
    type: 'simple-enum',
    enum: RefundRequestStatus,
    default: RefundRequestStatus.SUBMITTED,
  })
  status: RefundRequestStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser: User;

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  requestedByUserId: number;

  /** Denormalized snapshot of the requester's username, in case the user record later changes/is removed. */
  @Column({ name: 'requested_by', type: 'varchar', length: 100, nullable: true })
  requestedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedByUser: User;

  @Column({ name: 'reviewed_by_user_id', type: 'int', nullable: true })
  reviewedByUserId: number;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 100, nullable: true })
  reviewedBy: string;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser: User;

  @Column({ name: 'approved_by_user_id', type: 'int', nullable: true })
  approvedByUserId: number;

  @Column({ name: 'approved_by', type: 'varchar', length: 100, nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date;

  @Column({ name: 'refund_processed_at', type: 'datetime', nullable: true })
  refundProcessedAt: Date;

  @Column({ name: 'refund_gateway_response', type: 'json', nullable: true })
  refundGatewayResponse: any;

  // ── Bulk Operation Link (set when this request is part of a batch) ──
  @Column({ name: 'bulk_operation_id', type: 'int', nullable: true })
  bulkOperationId: number;

  @ManyToOne(() => BulkOperation, (bulkOp) => bulkOp.refundRequests, { nullable: true })
  @JoinColumn({ name: 'bulk_operation_id' })
  bulkOperation: BulkOperation;

  // ── Audit ──
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
