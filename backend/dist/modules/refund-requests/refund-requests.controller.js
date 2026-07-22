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
exports.RefundRequestsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const refund_requests_service_1 = require("./refund-requests.service");
const create_refund_request_dto_1 = require("./dto/create-refund-request.dto");
const review_refund_request_dto_1 = require("./dto/review-refund-request.dto");
const query_refund_requests_dto_1 = require("./dto/query-refund-requests.dto");
const bulk_review_refund_requests_dto_1 = require("./dto/bulk-review-refund-requests.dto");
const bulk_create_and_refund_dto_1 = require("./dto/bulk-create-and-refund.dto");
let RefundRequestsController = class RefundRequestsController {
    constructor(refundRequestsService) {
        this.refundRequestsService = refundRequestsService;
    }
    create(dto, user) {
        return this.refundRequestsService.create(dto, user);
    }
    findAll(query, user) {
        return this.refundRequestsService.findAll(query, user);
    }
    bulkReview(dto, user) {
        return this.refundRequestsService.bulkReview(dto.ids, dto.decision, dto.comment, user);
    }
    bulkCreateAndRefund(body, user) {
        return this.refundRequestsService.bulkCreateAndRefund(body.records, user, !!body.autoApprove);
    }
    findOne(id) {
        return this.refundRequestsService.findOne(+id);
    }
    review(id, dto, user) {
        return this.refundRequestsService.review(+id, dto, user);
    }
};
exports.RefundRequestsController = RefundRequestsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_refund_request_dto_1.CreateRefundRequestDto, Object]),
    __metadata("design:returntype", void 0)
], RefundRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_refund_requests_dto_1.QueryRefundRequestsDto, Object]),
    __metadata("design:returntype", void 0)
], RefundRequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('bulk-review'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('refund_requests.review'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_review_refund_requests_dto_1.BulkReviewRefundRequestsDto, Object]),
    __metadata("design:returntype", void 0)
], RefundRequestsController.prototype, "bulkReview", null);
__decorate([
    (0, common_1.Post)('bulk-create-and-refund'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('refund_requests.review'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_create_and_refund_dto_1.BulkCreateAndRefundDto, Object]),
    __metadata("design:returntype", void 0)
], RefundRequestsController.prototype, "bulkCreateAndRefund", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RefundRequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/review'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('refund_requests.review'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_refund_request_dto_1.ReviewRefundRequestDto, Object]),
    __metadata("design:returntype", void 0)
], RefundRequestsController.prototype, "review", null);
exports.RefundRequestsController = RefundRequestsController = __decorate([
    (0, common_1.Controller)('refund-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [refund_requests_service_1.RefundRequestsService])
], RefundRequestsController);
//# sourceMappingURL=refund-requests.controller.js.map