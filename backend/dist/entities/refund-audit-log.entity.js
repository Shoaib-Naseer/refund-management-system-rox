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
exports.RefundAuditLog = void 0;
const typeorm_1 = require("typeorm");
const refund_case_entity_1 = require("./refund-case.entity");
let RefundAuditLog = class RefundAuditLog {
};
exports.RefundAuditLog = RefundAuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RefundAuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_case_id', type: 'int' }),
    __metadata("design:type", Number)
], RefundAuditLog.prototype, "refundCaseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], RefundAuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'old_value', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RefundAuditLog.prototype, "oldValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_value', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RefundAuditLog.prototype, "newValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundAuditLog.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performed_by', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], RefundAuditLog.prototype, "performedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", String)
], RefundAuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundAuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'performed_at' }),
    __metadata("design:type", Date)
], RefundAuditLog.prototype, "performedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => refund_case_entity_1.RefundCase, (refundCase) => refundCase.auditLogs, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'refund_case_id' }),
    __metadata("design:type", refund_case_entity_1.RefundCase)
], RefundAuditLog.prototype, "refundCase", void 0);
exports.RefundAuditLog = RefundAuditLog = __decorate([
    (0, typeorm_1.Entity)('refund_audit_logs'),
    (0, typeorm_1.Index)(['refundCaseId']),
    (0, typeorm_1.Index)(['performedAt']),
    (0, typeorm_1.Index)(['action'])
], RefundAuditLog);
//# sourceMappingURL=refund-audit-log.entity.js.map