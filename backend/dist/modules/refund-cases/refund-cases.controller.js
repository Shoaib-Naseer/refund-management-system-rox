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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundCasesController = void 0;
const common_1 = require("@nestjs/common");
const refund_cases_service_1 = require("./refund-cases.service");
const create_refund_case_dto_1 = require("./dto/create-refund-case.dto");
const query_refund_cases_dto_1 = require("./dto/query-refund-cases.dto");
let RefundCasesController = class RefundCasesController {
    constructor(refundCasesService) {
        this.refundCasesService = refundCasesService;
    }
    create(createDto, req) {
        const userContext = {
            username: req.user?.username || 'system',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        };
        return this.refundCasesService.create(createDto, userContext);
    }
    findAll(queryDto) {
        return this.refundCasesService.findAll(queryDto);
    }
    findAllByMsisdn(msisdn) {
        return this.refundCasesService.findAllByMsisdn(msisdn);
    }
    findOne(id) {
        return this.refundCasesService.findOne(+id);
    }
    verifyCase(id, req) {
        const userContext = {
            username: req.user?.username || 'system',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        };
        return this.refundCasesService.verifyCase(+id, userContext);
    }
    processRefund(id, req) {
        const userContext = {
            username: req.user?.username || 'system',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        };
        return this.refundCasesService.processRefund(+id, userContext);
    }
};
exports.RefundCasesController = RefundCasesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_refund_case_dto_1.CreateRefundCaseDto, Object]),
    __metadata("design:returntype", void 0)
], RefundCasesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_refund_cases_dto_1.QueryRefundCasesDto]),
    __metadata("design:returntype", void 0)
], RefundCasesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-msisdn/:msisdn'),
    __param(0, (0, common_1.Param)('msisdn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RefundCasesController.prototype, "findAllByMsisdn", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RefundCasesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RefundCasesController.prototype, "verifyCase", null);
__decorate([
    (0, common_1.Post)(':id/refund'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RefundCasesController.prototype, "processRefund", null);
exports.RefundCasesController = RefundCasesController = __decorate([
    (0, common_1.Controller)('cases'),
    __metadata("design:paramtypes", [refund_cases_service_1.RefundCasesService])
], RefundCasesController);
//# sourceMappingURL=refund-cases.controller.js.map