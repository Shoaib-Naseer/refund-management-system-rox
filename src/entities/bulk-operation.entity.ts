import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RefundRequest } from './refund-request.entity';

export enum BulkOperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('bulk_operations')
@Index(['status'])
@Index(['createdAt'])
export class BulkOperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'operation_number',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  operationNumber: string;

  // Batch Progress Counters
  @Column({ name: 'total_cases', type: 'int', default: 0 })
  totalCases: number;

  @Column({ name: 'processed_cases', type: 'int', default: 0 })
  processedCases: number;

  @Column({ name: 'successful_refunds', type: 'int', default: 0 })
  successfulRefunds: number;

  @Column({ name: 'failed_refunds', type: 'int', default: 0 })
  failedRefunds: number;

  // Status
  @Column({
    type: 'simple-enum',
    enum: BulkOperationStatus,
    default: BulkOperationStatus.PENDING,
  })
  status: BulkOperationStatus;

  @Column({
    name: 'progress_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.0,
  })
  progressPercentage: number;

  // Error info if overall batch fails
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ name: 'currently_processing_ref', type: 'varchar', length: 100, nullable: true })
  currentlyProcessingRef: string;

  @Column({ name: 'logs', type: 'simple-json', nullable: true })
  logs: string[];

  // Direct relation to individual refund requests (no intermediate table)
  @OneToMany(() => RefundRequest, (req) => req.bulkOperation)
  refundRequests: RefundRequest[];
}
