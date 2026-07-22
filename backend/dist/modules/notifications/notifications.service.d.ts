import { DataSource } from "typeorm";
export type NotificationType = "INFO" | "SUCCESS" | "WARNING";
export interface NotificationSendResult {
    delivered: boolean;
    reason: "sent" | "user_not_found" | "no_device_token" | "request_failed";
    detail?: string;
}
export declare class NotificationsService {
    private readonly sourceDataSource;
    private readonly logger;
    private readonly baseUrl;
    constructor(sourceDataSource: DataSource);
    private resolveUserAndToken;
    notify(msisdn: string, title: string, message: string, type: NotificationType, data?: Record<string, string>): Promise<void>;
    sendNotification(msisdn: string, title: string, message: string, type: NotificationType, data?: Record<string, string>): Promise<NotificationSendResult>;
}
