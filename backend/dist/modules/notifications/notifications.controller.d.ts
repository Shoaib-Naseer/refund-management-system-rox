import { NotificationsService } from './notifications.service';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    sendTest(dto: SendTestNotificationDto): Promise<import("./notifications.service").NotificationSendResult>;
}
