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
exports.BulkOperationLog = void 0;
const typeorm_1 = require("typeorm");
const bulk_operation_entity_1 = require("./bulk-operation.entity");
let BulkOperationLog = class BulkOperationLog {
};
exports.BulkOperationLog = BulkOperationLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BulkOperationLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bulk_operation_id', type: 'int' }),
    __metadata("design:type", Number)
], BulkOperationLog.prototype, "bulkOperationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], BulkOperationLog.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], BulkOperationLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bulk_operation_entity_1.BulkOperation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'bulk_operation_id' }),
    __metadata("design:type", bulk_operation_entity_1.BulkOperation)
], BulkOperationLog.prototype, "bulkOperation", void 0);
exports.BulkOperationLog = BulkOperationLog = __decorate([
    (0, typeorm_1.Entity)('bulk_operation_logs')
], BulkOperationLog);
//# sourceMappingURL=bulk-operation-log.entity.js.map