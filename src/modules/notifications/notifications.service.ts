import { Inject, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import axios from "axios";
import { toSubscriberFormat } from "../verification/msisdn-utils";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING";

export interface NotificationSendResult {
  delivered: boolean;
  reason: "sent" | "user_not_found" | "no_device_token" | "request_failed";
  detail?: string;
}

/**
 * Sends customer-facing push notifications via rox-notifications-server.
 * That service enforces a DB foreign key from Notifications.user_id into
 * its own Users table (in the shared `rox_app` schema) — the same schema
 * this backend already has read access to via SOURCE_DATA_SOURCE (see
 * history.service.ts). So resolving "msisdn -> {user_id, deviceToken}" is
 * one query against a connection that already exists, not a new
 * cross-service call.
 *
 * Every method here is best-effort: a notification failure (unreachable
 * service, no device token, no matching user) must never fail the refund
 * operation that triggered it — always caught and logged, never thrown.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly baseUrl = process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3005";

  constructor(@Inject("SOURCE_DATA_SOURCE") private readonly sourceDataSource: DataSource) {}

  private async resolveUserAndToken(
    msisdn: string,
  ): Promise<{ userId: string; deviceToken: string | null } | null> {
    const normalized = toSubscriberFormat(msisdn);
    const rows = await this.sourceDataSource.query(
      "SELECT user_id, deviceToken FROM `rox_app`.`Users` WHERE mobile_number = ? LIMIT 1",
      [normalized],
    );
    const row = rows?.[0];
    if (!row) return null;
    return { userId: row.user_id, deviceToken: row.deviceToken || null };
  }

  /**
   * Best-effort fire-and-forget send — used by the actual refund lifecycle
   * hooks (submitted/rejected/refunded). Never throws, so it's safe to call
   * without awaiting from a request/transaction path. Always logs the real
   * outcome (sendNotification() itself never throws — it converts failures
   * into a result — so this is the only place that outcome is recorded for
   * these calls; there's no persisted/queryable delivery status yet).
   */
  async notify(
    msisdn: string,
    title: string,
    message: string,
    type: NotificationType,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const result = await this.sendNotification(msisdn, title, message, type, data);
      if (result.delivered) {
        this.logger.log(`[Notifications] Sent "${title}" to ${msisdn}`);
      } else {
        this.logger.warn(`[Notifications] Not delivered to ${msisdn} (${result.reason}): ${result.detail}`);
      }
    } catch (err: any) {
      // Defensive only — sendNotification() shouldn't reach here today.
      this.logger.warn(`[Notifications] Unexpected error notifying ${msisdn}: ${err.message}`);
    }
  }

  /**
   * Same delivery path as notify(), but reports back exactly what happened
   * instead of swallowing everything — used by the admin "send test
   * notification" tool, where a human is waiting to see the actual result
   * (no matching user? no device token? gateway error?) rather than a
   * silent no-op.
   */
  async sendNotification(
    msisdn: string,
    title: string,
    message: string,
    type: NotificationType,
    data?: Record<string, string>,
  ): Promise<NotificationSendResult> {
    const target = await this.resolveUserAndToken(msisdn);
    if (!target) {
      return { delivered: false, reason: "user_not_found", detail: `No ROX user found for MSISDN ${msisdn}` };
    }
    if (!target.deviceToken) {
      return { delivered: false, reason: "no_device_token", detail: `User ${target.userId} has no registered device token` };
    }

    try {
      const res = await axios.post(
        `${this.baseUrl}/notifications/push`,
        {
          fcmToken: target.deviceToken,
          userId: target.userId,
          title,
          message,
          type,
          data,
        },
        { timeout: 5000 },
      );
      return { delivered: true, reason: "sent", detail: JSON.stringify(res.data) };
    } catch (err: any) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      return { delivered: false, reason: "request_failed", detail };
    }
  }
}
