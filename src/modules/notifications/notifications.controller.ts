import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { NotificationsService } from './notifications.service';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Admin-only utility to send a real push notification to an arbitrary
   * MSISDN, for testing that the msisdn -> user_id -> deviceToken -> FCM
   * pipeline actually works end to end (same permission that gates the
   * Users/Roles admin screens — the one permission only admin holds).
   */
  @Post('test')
  @RequirePermissions('refund_requests.override_approve')
  sendTest(@Body() dto: SendTestNotificationDto) {
    return this.notificationsService.sendNotification(dto.msisdn, dto.title, dto.message, dto.type || 'INFO');
  }
}
