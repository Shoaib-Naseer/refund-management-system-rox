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
exports.RefundRequest = exports.RefundRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const refund_case_entity_1 = require("./refund-case.entity");
const user_entity_1 = require("./user.entity");
const bulk_operation_entity_1 = require("./bulk-operation.entity");
var RefundRequestStatus;
(function (RefundRequestStatus) {
    RefundRequestStatus["SUBMITTED"] = "submitted";
    RefundRequestStatus["UNDER_REVIEW"] = "under_review";
    RefundRequestStatus["APPROVED"] = "approved";
    RefundRequestStatus["REJECTED"] = "rejected";
    RefundRequestStatus["PROCESSING"] = "processing";
    RefundRequestStatus["REFUNDED"] = "refunded";
    RefundRequestStatus["FAILED"] = "failed";
})(RefundRequestStatus || (exports.RefundRequestStatus = RefundRequestStatus = {}));
let RefundRequest = class RefundRequest {
};
exports.RefundRequest = RefundRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RefundRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => refund_case_entity_1.RefundCase, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'refund_case_id' }),
    __metadata("design:type", refund_case_entity_1.RefundCase)
], RefundRequest.prototype, "refundCase", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_case_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "refundCaseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 15 }),
    __metadata("design:type", String)
], RefundRequest.prototype, "msisdn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'tinyint' }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "era", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_name', type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], RefundRequest.prototype, "tableName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transaction_reference', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], RefundRequest.prototype, "transactionReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_order_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "paymentOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_name', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "packageName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_deducted', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "amountDeducted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'loan_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "loanAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_amount', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "userAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_partial_refund', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RefundRequest.prototype, "isPartialRefund", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_refund_amount', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "requestedRefundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_posted', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "packagePosted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fulfillment_status', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "fulfillmentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fulfillment_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "fulfillmentMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_eligibility', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "refundEligibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_timestamp', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RefundRequest.prototype, "sourceTimestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "mobileNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wallet_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "walletNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inquiry_snapshot', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RefundRequest.prototype, "inquirySnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'request_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "requestReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_override', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RefundRequest.prototype, "isOverride", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'override_justification', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "overrideJustification", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requires_override_approval', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RefundRequest.prototype, "requiresOverrideApproval", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: RefundRequestStatus,
        default: RefundRequestStatus.SUBMITTED,
    }),
    __metadata("design:type", String)
], RefundRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'requested_by_user_id' }),
    __metadata("design:type", user_entity_1.User)
], RefundRequest.prototype, "requestedByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_by_user_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "requestedByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "requestedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'reviewed_by_user_id' }),
    __metadata("design:type", user_entity_1.User)
], RefundRequest.prototype, "reviewedByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_by_user_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "reviewedByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RefundRequest.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'review_comment', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "reviewComment", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'approved_by_user_id' }),
    __metadata("design:type", user_entity_1.User)
], RefundRequest.prototype, "approvedByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by_user_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "approvedByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RefundRequest.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_processed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RefundRequest.prototype, "refundProcessedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_gateway_response', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], RefundRequest.prototype, "refundGatewayResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bulk_operation_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "bulkOperationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bulk_operation_entity_1.BulkOperation, (bulkOp) => bulkOp.refundRequests, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'bulk_operation_id' }),
    __metadata("design:type", bulk_operation_entity_1.BulkOperation)
], RefundRequest.prototype, "bulkOperation", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], RefundRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], RefundRequest.prototype, "updatedAt", void 0);
exports.RefundRequest = RefundRequest = __decorate([
    (0, typeorm_1.Entity)('refund_requests'),
    (0, typeorm_1.Index)(['msisdn']),
    (0, typeorm_1.Index)(['era', 'transactionReference']),
    (0, typeorm_1.Index)(['status'])
], RefundRequest);
//# sourceMappingURL=refund-request.entity.js.map