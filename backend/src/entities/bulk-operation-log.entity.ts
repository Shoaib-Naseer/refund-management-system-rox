import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BulkOperation } from './bulk-operation.entity';

@Entity('bulk_operation_logs')
export class BulkOperationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bulk_operation_id', type: 'int' })
  bulkOperationId: number;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => BulkOperation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bulk_operation_id' })
  bulkOperation: BulkOperation;
}
