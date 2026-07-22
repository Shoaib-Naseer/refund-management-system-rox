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

export enum NotificationType {
  SMS = 'sms',
  EMAIL = 'email',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRY = 'retry',
}

@Entity('refund_notifications')
@Index(['refundCaseId'])
@Index(['status'])
@Index(['createdAt'])
export class RefundNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'refund_case_id', type: 'int' })
  refundCaseId: number;

  // Notification Details
  @Column({
    name: 'notification_type',
    type: 'simple-enum',
    enum: NotificationType,
  })
  notificationType: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'text' })
  message: string;

  // Status
  @Column({
    type: 'simple-enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  // Timestamps
  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => RefundCase, (refundCase) => refundCase.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'refund_case_id' })
  refundCase: RefundCase;
}
