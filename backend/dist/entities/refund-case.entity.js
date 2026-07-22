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
exports.RefundCase = exports.PaymentMethod = exports.RefundStatus = exports.VerificationResult = exports.RefundCaseStatus = void 0;
const typeorm_1 = require("typeorm");
const refund_audit_log_entity_1 = require("./refund-audit-log.entity");
const refund_notification_entity_1 = require("./refund-notification.entity");
const bulk_operation_entity_1 = require("./bulk-operation.entity");
var RefundCaseStatus;
(function (RefundCaseStatus) {
    RefundCaseStatus["PENDING"] = "pending";
    RefundCaseStatus["VERIFIED"] = "verified";
    RefundCaseStatus["REJECTED"] = "rejected";
    RefundCaseStatus["PROCESSING"] = "processing";
    RefundCaseStatus["REFUNDED"] = "refunded";
    RefundCaseStatus["FAILED"] = "failed";
})(RefundCaseStatus || (exports.RefundCaseStatus = RefundCaseStatus = {}));
var VerificationResult;
(function (VerificationResult) {
    VerificationResult["APPROVED"] = "approved";
    VerificationResult["REJECTED"] = "rejected";
    VerificationResult["NOT_FOUND"] = "not_found";
})(VerificationResult || (exports.VerificationResult = VerificationResult = {}));
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["NOT_PROCESSED"] = "not_processed";
    RefundStatus["SUCCESS"] = "success";
    RefundStatus["FAILED"] = "failed";
    RefundStatus["PENDING"] = "pending";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["EASY_PAISA"] = "Easy_Paisa";
    PaymentMethod["JAZZ_CASH"] = "Jazz_Cash";
    PaymentMethod["CARD"] = "Card";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
let RefundCase = class RefundCase {
};
exports.RefundCase = RefundCase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RefundCase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'case_number', type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "caseNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 15 }),
    __metadata("design:type", String)
], RefundCase.prototype, "msisdn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], RefundCase.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'payment_method',
        type: 'simple-enum',
        enum: PaymentMethod,
        nullable: true,
    }),
    __metadata("design:type", String)
], RefundCase.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_number', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "accountNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_code', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "packageCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'transaction_datetime',
        type: 'datetime',
        nullable: true,
    }),
    __metadata("design:type", Date)
], RefundCase.prototype, "transactionDatetime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'source_transaction_id',
        type: 'bigint',
        unsigned: true,
        nullable: true,
    }),
    __metadata("design:type", Number)
], RefundCase.prototype, "sourceTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_snapshot', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RefundCase.prototype, "sourceSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: RefundCaseStatus,
        default: RefundCaseStatus.PENDING,
    }),
    __metadata("design:type", String)
], RefundCase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'verification_result',
        type: 'simple-enum',
        enum: VerificationResult,
        nullable: true,
    }),
    __metadata("design:type", String)
], RefundCase.prototype, "verificationResult", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_comment', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "verificationComment", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eligibility_checks', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RefundCase.prototype, "eligibilityChecks", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RefundCase.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "verifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'refund_status',
        type: 'simple-enum',
        enum: RefundStatus,
        default: RefundStatus.NOT_PROCESSED,
    }),
    __metadata("design:type", String)
], RefundCase.prototype, "refundStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_description', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "refundDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_raw_response', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "refundRawResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'refund_processed_at',
        type: 'datetime',
        nullable: true,
    }),
    __metadata("design:type", Date)
], RefundCase.prototype, "refundProcessedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'refund_processed_by',
        type: 'varchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", String)
], RefundCase.prototype, "refundProcessedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'bulk_operation_id',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Number)
], RefundCase.prototype, "bulkOperationId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], RefundCase.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], RefundCase.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], RefundCase.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => refund_audit_log_entity_1.RefundAuditLog, (log) => log.refundCase),
    __metadata("design:type", Array)
], RefundCase.prototype, "auditLogs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => refund_notification_entity_1.RefundNotification, (notification) => notification.refundCase),
    __metadata("design:type", Array)
], RefundCase.prototype, "notifications", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bulk_operation_entity_1.BulkOperation, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'bulk_operation_id' }),
    __metadata("design:type", bulk_operation_entity_1.BulkOperation)
], RefundCase.prototype, "bulkOperation", void 0);
exports.RefundCase = RefundCase = __decorate([
    (0, typeorm_1.Entity)('refund_cases'),
    (0, typeorm_1.Index)(['msisdn']),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['bulkOperationId'])
], RefundCase);
//# sourceMappingURL=refund-case.entity.js.map