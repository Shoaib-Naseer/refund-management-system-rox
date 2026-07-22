"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const axios_1 = require("axios");
const msisdn_utils_1 = require("../verification/msisdn-utils");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(sourceDataSource) {
        this.sourceDataSource = sourceDataSource;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.baseUrl = process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3005";
    }
    async resolveUserAndToken(msisdn) {
        const normalized = (0, msisdn_utils_1.toSubscriberFormat)(msisdn);
        const rows = await this.sourceDataSource.query("SELECT user_id, deviceToken FROM `rox_app`.`Users` WHERE mobile_number = ? LIMIT 1", [normalized]);
        const row = rows?.[0];
        if (!row)
            return null;
        return { userId: row.user_id, deviceToken: row.deviceToken || null };
    }
    async notify(msisdn, title, message, type, data) {
        try {
            const result = await this.sendNotification(msisdn, title, message, type, data);
            if (result.delivered) {
                this.logger.log(`[Notifications] Sent "${title}" to ${msisdn}`);
            }
            else {
                this.logger.warn(`[Notifications] Not delivered to ${msisdn} (${result.reason}): ${result.detail}`);
            }
        }
        catch (err) {
            this.logger.warn(`[Notifications] Unexpected error notifying ${msisdn}: ${err.message}`);
        }
    }
    async sendNotification(msisdn, title, message, type, data) {
        const target = await this.resolveUserAndToken(msisdn);
        if (!target) {
            return { delivered: false, reason: "user_not_found", detail: `No ROX user found for MSISDN ${msisdn}` };
        }
        if (!target.deviceToken) {
            return { delivered: false, reason: "no_device_token", detail: `User ${target.userId} has no registered device token` };
        }
        try {
            const res = await axios_1.default.post(`${this.baseUrl}/notifications/push`, {
                fcmToken: target.deviceToken,
                userId: target.userId,
                title,
                message,
                type,
                data,
            }, { timeout: 5000 });
            return { delivered: true, reason: "sent", detail: JSON.stringify(res.data) };
        }
        catch (err) {
            const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            return { delivered: false, reason: "request_failed", detail };
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)("SOURCE_DATA_SOURCE")),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map