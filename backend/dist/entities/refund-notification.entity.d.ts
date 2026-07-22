import { RefundCase } from './refund-case.entity';
export declare enum NotificationType {
    SMS = "sms",
    EMAIL = "email"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    FAILED = "failed",
    RETRY = "retry"
}
export declare class RefundNotification {
    id: number;
    refundCaseId: number;
    notificationType: NotificationType;
    recipient: string;
    message: string;
    status: NotificationStatus;
    errorMessage: string;
    retryCount: number;
    sentAt: Date;
    createdAt: Date;
    refundCase: RefundCase;
}
