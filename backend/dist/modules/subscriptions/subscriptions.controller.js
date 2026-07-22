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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("./subscriptions.service");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    getEligibleOld(dateFrom, dateTo, paymentMethod, packageName, refundStatus, page = 1, limit = 50) {
        return this.subscriptionsService.getEligibleOldSubscriptions({
            dateFrom,
            dateTo,
            paymentMethod,
            packageName,
            refundStatus,
            page,
            limit: Math.min(limit, 200),
        });
    }
    getEligibleNew(dateFrom, dateTo, paymentMethod, packageName, refundStatus, page = 1, limit = 50) {
        return this.subscriptionsService.getEligibleNewSubscriptions({
            dateFrom,
            dateTo,
            paymentMethod,
            packageName,
            refundStatus,
            page,
            limit: Math.min(limit, 200),
        });
    }
    getEligibleAll(dateFrom, dateTo, paymentMethod, packageName, refundStatus, page = 1, limit = 50) {
        return this.subscriptionsService.getEligibleAllSubscriptions({
            dateFrom,
            dateTo,
            paymentMethod,
            packageName,
            refundStatus,
            page,
            limit: Math.min(limit, 200),
        });
    }
    getProcessedOld(dateFrom, dateTo, refundedAtFrom, refundedAtTo, paymentMethod, packageName, page = 1, limit = 50) {
        return this.subscriptionsService.getProcessedSubscriptions({
            dateFrom,
            dateTo,
            refundedAtFrom,
            refundedAtTo,
            paymentMethod,
            packageName,
            page,
            limit: Math.min(limit, 200),
        }, 2);
    }
    getProcessedNew(dateFrom, dateTo, refundedAtFrom, refundedAtTo, paymentMethod, packageName, page = 1, limit = 50) {
        return this.subscriptionsService.getProcessedSubscriptions({
            dateFrom,
            dateTo,
            refundedAtFrom,
            refundedAtTo,
            paymentMethod,
            packageName,
            page,
            limit: Math.min(limit, 200),
        }, 3);
    }
    getProcessedAll(dateFrom, dateTo, refundedAtFrom, refundedAtTo, paymentMethod, packageName, page = 1, limit = 50) {
        return this.subscriptionsService.getProcessedSubscriptions({
            dateFrom,
            dateTo,
            refundedAtFrom,
            refundedAtTo,
            paymentMethod,
            packageName,
            page,
            limit: Math.min(limit, 200),
        });
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('eligible/old'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('paymentMethod')),
    __param(3, (0, common_1.Query)('packageName')),
    __param(4, (0, common_1.Query)('refundStatus')),
    __param(5, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getEligibleOld", null);
__decorate([
    (0, common_1.Get)('eligible/new'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('paymentMethod')),
    __param(3, (0, common_1.Query)('packageName')),
    __param(4, (0, common_1.Query)('refundStatus')),
    __param(5, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getEligibleNew", null);
__decorate([
    (0, common_1.Get)('eligible/all'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('paymentMethod')),
    __param(3, (0, common_1.Query)('packageName')),
    __param(4, (0, common_1.Query)('refundStatus')),
    __param(5, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getEligibleAll", null);
__decorate([
    (0, common_1.Get)('processed/old'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('refundedAtFrom')),
    __param(3, (0, common_1.Query)('refundedAtTo')),
    __param(4, (0, common_1.Query)('paymentMethod')),
    __param(5, (0, common_1.Query)('packageName')),
    __param(6, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(7, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getProcessedOld", null);
__decorate([
    (0, common_1.Get)('processed/new'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('refundedAtFrom')),
    __param(3, (0, common_1.Query)('refundedAtTo')),
    __param(4, (0, common_1.Query)('paymentMethod')),
    __param(5, (0, common_1.Query)('packageName')),
    __param(6, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(7, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getProcessedNew", null);
__decorate([
    (0, common_1.Get)('processed/all'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('refundedAtFrom')),
    __param(3, (0, common_1.Query)('refundedAtTo')),
    __param(4, (0, common_1.Query)('paymentMethod')),
    __param(5, (0, common_1.Query)('packageName')),
    __param(6, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(7, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getProcessedAll", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map