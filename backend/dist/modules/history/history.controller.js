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
exports.HistoryController = void 0;
const common_1 = require("@nestjs/common");
const history_service_1 = require("./history.service");
let HistoryController = class HistoryController {
    constructor(historyService) {
        this.historyService = historyService;
    }
    getHistory(msisdn, amount, date, packageName, includeEra1, era) {
        const parsedAmount = amount !== undefined && amount !== '' ? Number(amount) : null;
        const parsedDate = date ? new Date(date) : null;
        return this.historyService.getMsisdnHistory(msisdn, {
            amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
            date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null,
            packageName: packageName || null,
            includeEra1: includeEra1 === 'true',
            era: era || null,
        });
    }
};
exports.HistoryController = HistoryController;
__decorate([
    (0, common_1.Get)(':msisdn'),
    __param(0, (0, common_1.Param)('msisdn')),
    __param(1, (0, common_1.Query)('amount')),
    __param(2, (0, common_1.Query)('date')),
    __param(3, (0, common_1.Query)('packageName')),
    __param(4, (0, common_1.Query)('includeEra1')),
    __param(5, (0, common_1.Query)('era')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "getHistory", null);
exports.HistoryController = HistoryController = __decorate([
    (0, common_1.Controller)('history'),
    __metadata("design:paramtypes", [history_service_1.HistoryService])
], HistoryController);
//# sourceMappingURL=history.controller.js.map