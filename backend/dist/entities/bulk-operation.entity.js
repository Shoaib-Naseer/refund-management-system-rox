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
exports.BulkOperation = exports.BulkOperationStatus = void 0;
const typeorm_1 = require("typeorm");
const refund_request_entity_1 = require("./refund-request.entity");
var BulkOperationStatus;
(function (BulkOperationStatus) {
    BulkOperationStatus["PENDING"] = "pending";
    BulkOperationStatus["PROCESSING"] = "processing";
    BulkOperationStatus["COMPLETED"] = "completed";
    BulkOperationStatus["FAILED"] = "failed";
})(BulkOperationStatus || (exports.BulkOperationStatus = BulkOperationStatus = {}));
let BulkOperation = class BulkOperation {
};
exports.BulkOperation = BulkOperation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BulkOperation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'operation_number',
        type: 'varchar',
        length: 50,
        unique: true,
    }),
    __metadata("design:type", String)
], BulkOperation.prototype, "operationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_cases', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BulkOperation.prototype, "totalCases", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'processed_cases', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BulkOperation.prototype, "processedCases", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'successful_refunds', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BulkOperation.prototype, "successfulRefunds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_refunds', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BulkOperation.prototype, "failedRefunds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: BulkOperationStatus,
        default: BulkOperationStatus.PENDING,
    }),
    __metadata("design:type", String)
], BulkOperation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'progress_percentage',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.0,
    }),
    __metadata("design:type", Number)
], BulkOperation.prototype, "progressPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], BulkOperation.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], BulkOperation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], BulkOperation.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BulkOperation.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], BulkOperation.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currently_processing_ref', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BulkOperation.prototype, "currentlyProcessingRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logs', type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], BulkOperation.prototype, "logs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => refund_request_entity_1.RefundRequest, (req) => req.bulkOperation),
    __metadata("design:type", Array)
], BulkOperation.prototype, "refundRequests", void 0);
exports.BulkOperation = BulkOperation = __decorate([
    (0, typeorm_1.Entity)('bulk_operations'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt'])
], BulkOperation);
//# sourceMappingURL=bulk-operation.entity.js.map