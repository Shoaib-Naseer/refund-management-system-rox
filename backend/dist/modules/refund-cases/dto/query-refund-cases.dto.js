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
exports.QueryRefundCasesDto = void 0;
const class_validator_1 = require("class-validator");
const refund_case_entity_1 = require("../../../entities/refund-case.entity");
class QueryRefundCasesDto {
}
exports.QueryRefundCasesDto = QueryRefundCasesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(refund_case_entity_1.RefundCaseStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(refund_case_entity_1.VerificationResult),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "verificationResult", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(refund_case_entity_1.RefundStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "refundStatus", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(refund_case_entity_1.PaymentMethod),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "msisdn", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryRefundCasesDto.prototype, "endDate", void 0);
//# sourceMappingURL=query-refund-cases.dto.js.map