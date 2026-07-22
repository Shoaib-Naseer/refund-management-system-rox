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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundNotification = exports.NotificationStatus = exports.NotificationType = void 0;
const typeorm_1 = require("typeorm");
const refund_case_entity_1 = require("./refund-case.entity");
var NotificationType;
(function (NotificationType) {
    NotificationType["SMS"] = "sms";
    NotificationType["EMAIL"] = "email";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["RETRY"] = "retry";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
let RefundNotification = class RefundNotification {
};
exports.RefundNotification = RefundNotification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RefundNotification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_case_id', type: 'int' }),
    __metadata("design:type", Number)
], RefundNotification.prototype, "refundCaseId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'notification_type',
        type: 'simple-enum',
        enum: NotificationType,
    }),
    __metadata("design:type", String)
], RefundNotification.prototype, "notificationType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], RefundNotification.prototype, "recipient", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], RefundNotification.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: NotificationStatus,
        default: NotificationStatus.PENDING,
    }),
    __metadata("design:type", String)
], RefundNotification.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundNotification.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RefundNotification.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RefundNotification.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], RefundNotification.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => refund_case_entity_1.RefundCase, (refundCase) => refundCase.notifications, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'refund_case_id' }),
    __metadata("design:type", refund_case_entity_1.RefundCase)
], RefundNotification.prototype, "refundCase", void 0);
exports.RefundNotification = RefundNotification = __decorate([
    (0, typeorm_1.Entity)('refund_notifications'),
    (0, typeorm_1.Index)(['refundCaseId']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt'])
], RefundNotification);
//# sourceMappingURL=refund-notification.entity.js.map