"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundCasesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const refund_case_entity_1 = require("../../entities/refund-case.entity");
const refund_cases_service_1 = require("./refund-cases.service");
const refund_cases_controller_1 = require("./refund-cases.controller");
const verification_module_1 = require("../verification/verification.module");
const refund_processing_module_1 = require("../refund-processing/refund-processing.module");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
let RefundCasesModule = class RefundCasesModule {
};
exports.RefundCasesModule = RefundCasesModule;
exports.RefundCasesModule = RefundCasesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([refund_case_entity_1.RefundCase]),
            verification_module_1.VerificationModule,
            refund_processing_module_1.RefundProcessingModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [refund_cases_controller_1.RefundCasesController],
        providers: [refund_cases_service_1.RefundCasesService],
        exports: [refund_cases_service_1.RefundCasesService],
    })
], RefundCasesModule);
//# sourceMappingURL=refund-cases.module.js.map