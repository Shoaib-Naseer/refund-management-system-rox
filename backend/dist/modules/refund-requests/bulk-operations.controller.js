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
exports.BulkOperationsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const bulk_operation_entity_1 = require("../../entities/bulk-operation.entity");
const bulk_operation_log_entity_1 = require("../../entities/bulk-operation-log.entity");
let BulkOperationsController = class BulkOperationsController {
    constructor(bulkOperationRepo, bulkOperationLogRepo) {
        this.bulkOperationRepo = bulkOperationRepo;
        this.bulkOperationLogRepo = bulkOperationLogRepo;
    }
    async findOne(id) {
        const op = await this.bulkOperationRepo.findOne({ where: { id: +id } });
        if (!op) {
            return { error: `Bulk operation #${id} not found` };
        }
        const logs = await this.bulkOperationLogRepo.find({
            where: { bulkOperationId: op.id },
            order: { createdAt: 'ASC' },
        });
        return {
            ...op,
            logs: logs.map(l => l.message),
        };
    }
    async streamProgress(id, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        const send = (eventName, data) => {
            res.write(`event: ${eventName}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        const POLL_INTERVAL_MS = 1000;
        const interval = setInterval(async () => {
            try {
                const op = await this.bulkOperationRepo.findOne({ where: { id: +id } });
                if (!op) {
                    send('error', { message: `Bulk operation #${id} not found` });
                    clearInterval(interval);
                    res.end();
                    return;
                }
                const logs = await this.bulkOperationLogRepo.find({
                    where: { bulkOperationId: op.id },
                    order: { createdAt: 'ASC' },
                });
                send('message', {
                    id: op.id,
                    status: op.status,
                    total: op.totalCases,
                    processed: op.processedCases,
                    success: op.successfulRefunds,
                    failed: op.failedRefunds,
                    percentage: Number(op.progressPercentage),
                    currentlyProcessingRef: op.currentlyProcessingRef,
                    logs: logs.map(l => l.message),
                });
                if (op.status === 'completed' || op.status === 'failed') {
                    send('done', { status: op.status, completedAt: op.completedAt });
                    clearInterval(interval);
                    res.end();
                }
            }
            catch (error) {
                send('error', { message: error.message });
                clearInterval(interval);
                res.end();
            }
        }, POLL_INTERVAL_MS);
        res.on('close', () => {
            clearInterval(interval);
        });
    }
};
exports.BulkOperationsController = BulkOperationsController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BulkOperationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/stream'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BulkOperationsController.prototype, "streamProgress", null);
exports.BulkOperationsController = BulkOperationsController = __decorate([
    (0, common_1.Controller)('bulk-operations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, typeorm_1.InjectRepository)(bulk_operation_entity_1.BulkOperation)),
    __param(1, (0, typeorm_1.InjectRepository)(bulk_operation_log_entity_1.BulkOperationLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], BulkOperationsController);
//# sourceMappingURL=bulk-operations.controller.js.map