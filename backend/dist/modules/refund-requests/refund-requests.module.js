"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const refund_request_entity_1 = require("../../entities/refund-request.entity");
const refund_case_entity_1 = require("../../entities/refund-case.entity");
const bulk_operation_entity_1 = require("../../entities/bulk-operation.entity");
const bulk_operation_log_entity_1 = require("../../entities/bulk-operation-log.entity");
const refund_requests_controller_1 = require("./refund-requests.controller");
const bulk_operations_controller_1 = require("./bulk-operations.controller");
const refund_requests_service_1 = require("./refund-requests.service");
const refund_processor_1 = require("./refund.processor");
const refund_processing_module_1 = require("../refund-processing/refund-processing.module");
const auth_module_1 = require("../auth/auth.module");
const notifications_module_1 = require("../notifications/notifications.module");
let RefundRequestsModule = class RefundRequestsModule {
};
exports.RefundRequestsModule = RefundRequestsModule;
exports.RefundRequestsModule = RefundRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([refund_request_entity_1.RefundRequest, refund_case_entity_1.RefundCase, bulk_operation_entity_1.BulkOperation, bulk_operation_log_entity_1.BulkOperationLog]),
            bull_1.BullModule.registerQueue({
                name: 'refund-queue',
                limiter: {
                    max: 5,
                    duration: 1000,
                    bounceBack: false,
                },
            }),
            refund_processing_module_1.RefundProcessingModule,
            auth_module_1.AuthModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [refund_requests_controller_1.RefundRequestsController, bulk_operations_controller_1.BulkOperationsController],
        providers: [refund_requests_service_1.RefundRequestsService, refund_processor_1.RefundProcessor],
    })
], RefundRequestsModule);
//# sourceMappingURL=refund-requests.module.js.map