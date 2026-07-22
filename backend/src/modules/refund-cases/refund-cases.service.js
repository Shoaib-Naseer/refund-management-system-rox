"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundCasesService = void 0;
var common_1 = require("@nestjs/common");
var typeorm_1 = require("typeorm");
var refund_case_entity_1 = require("../../entities/refund-case.entity");
var RefundCasesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var RefundCasesService = _classThis = /** @class */ (function () {
        function RefundCasesService_1(refundCaseRepo, verificationService, refundProcessingService, auditLogsService) {
            this.refundCaseRepo = refundCaseRepo;
            this.verificationService = verificationService;
            this.refundProcessingService = refundProcessingService;
            this.auditLogsService = auditLogsService;
            this.logger = new common_1.Logger(RefundCasesService.name);
        }
        /**
         * Create a new refund case with auto-verification
         */
        RefundCasesService_1.prototype.create = function (createDto, userContext, bulkOperationId) {
            return __awaiter(this, void 0, void 0, function () {
                var caseNumber, normalizedMsisdn, refundCase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Creating refund case for MSISDN: ".concat(createDto.msisdn));
                            return [4 /*yield*/, this.generateCaseNumber()];
                        case 1:
                            caseNumber = _a.sent();
                            normalizedMsisdn = this.normalizeMsisdn(createDto.msisdn);
                            refundCase = this.refundCaseRepo.create({
                                caseNumber: caseNumber,
                                msisdn: normalizedMsisdn,
                                amount: createDto.amount,
                                paymentMethod: createDto.paymentMethod,
                                accountNumber: createDto.accountNumber,
                                packageCode: createDto.packageCode,
                                orderId: createDto.orderId,
                                transactionDatetime: createDto.transactionDatetime
                                    ? new Date(createDto.transactionDatetime)
                                    : null,
                                status: refund_case_entity_1.RefundCaseStatus.PENDING,
                                bulkOperationId: bulkOperationId || null,
                                createdBy: createDto.createdBy || (userContext === null || userContext === void 0 ? void 0 : userContext.username) || 'system',
                            });
                            return [4 /*yield*/, this.refundCaseRepo.save(refundCase)];
                        case 2:
                            _a.sent();
                            // Log creation
                            return [4 /*yield*/, this.auditLogsService.log({
                                    refundCaseId: refundCase.id,
                                    action: 'created',
                                    newValue: {
                                        caseNumber: caseNumber,
                                        msisdn: normalizedMsisdn,
                                        amount: createDto.amount,
                                        bulkOperationId: bulkOperationId || null,
                                    },
                                    description: bulkOperationId
                                        ? "Refund case created from bulk operation"
                                        : 'Refund case created',
                                    performedBy: refundCase.createdBy,
                                    ipAddress: userContext === null || userContext === void 0 ? void 0 : userContext.ip,
                                    userAgent: userContext === null || userContext === void 0 ? void 0 : userContext.userAgent,
                                })];
                        case 3:
                            // Log creation
                            _a.sent();
                            // Auto-verify
                            return [4 /*yield*/, this.verifyCase(refundCase.id, userContext)];
                        case 4:
                            // Auto-verify
                            _a.sent();
                            // Reload with relations
                            return [2 /*return*/, this.findOne(refundCase.id)];
                    }
                });
            });
        };
        /**
         * Verify a refund case
         */
        RefundCasesService_1.prototype.verifyCase = function (id, userContext) {
            return __awaiter(this, void 0, void 0, function () {
                var refundCase, verificationResult;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findOne(id)];
                        case 1:
                            refundCase = _a.sent();
                            this.logger.log("Verifying case: ".concat(refundCase.caseNumber));
                            return [4 /*yield*/, this.verificationService.verifyCase({
                                    msisdn: refundCase.msisdn,
                                    amount: Number(refundCase.amount),
                                    orderId: refundCase.orderId,
                                    transactionDatetime: refundCase.transactionDatetime,
                                })];
                        case 2:
                            verificationResult = _a.sent();
                            // Update case with verification results
                            refundCase.verificationResult = verificationResult.result;
                            refundCase.verificationComment = verificationResult.comment;
                            refundCase.eligibilityChecks = verificationResult.checks;
                            refundCase.sourceTransactionId = verificationResult.sourceTransactionId;
                            refundCase.sourceSnapshot = verificationResult.sourceRecord || null;
                            refundCase.verifiedAt = new Date();
                            refundCase.verifiedBy = (userContext === null || userContext === void 0 ? void 0 : userContext.username) || 'system';
                            // Update status based on verification result
                            if (verificationResult.result === refund_case_entity_1.VerificationResult.APPROVED) {
                                refundCase.status = refund_case_entity_1.RefundCaseStatus.VERIFIED;
                            }
                            else {
                                refundCase.status = refund_case_entity_1.RefundCaseStatus.REJECTED;
                            }
                            return [4 /*yield*/, this.refundCaseRepo.save(refundCase)];
                        case 3:
                            _a.sent();
                            // Log verification
                            return [4 /*yield*/, this.auditLogsService.log({
                                    refundCaseId: refundCase.id,
                                    action: 'verified',
                                    newValue: {
                                        verificationResult: verificationResult.result,
                                        status: refundCase.status,
                                    },
                                    description: "Case verified: ".concat(verificationResult.comment),
                                    performedBy: refundCase.verifiedBy,
                                    ipAddress: userContext === null || userContext === void 0 ? void 0 : userContext.ip,
                                    userAgent: userContext === null || userContext === void 0 ? void 0 : userContext.userAgent,
                                })];
                        case 4:
                            // Log verification
                            _a.sent();
                            return [2 /*return*/, refundCase];
                    }
                });
            });
        };
        /**
         * Process refund for a verified case
         */
        RefundCasesService_1.prototype.processRefund = function (id, userContext) {
            return __awaiter(this, void 0, void 0, function () {
                var refundCase, refundResult, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findOne(id)];
                        case 1:
                            refundCase = _a.sent();
                            // Validate case is verified and approved
                            if (refundCase.verificationResult !== refund_case_entity_1.VerificationResult.APPROVED) {
                                throw new Error('Case must be verified and approved before processing refund');
                            }
                            if (refundCase.refundStatus === refund_case_entity_1.RefundStatus.SUCCESS) {
                                throw new Error('Refund already processed successfully for this case');
                            }
                            this.logger.log("Processing refund for case: ".concat(refundCase.caseNumber));
                            // Update status to processing
                            refundCase.status = refund_case_entity_1.RefundCaseStatus.PROCESSING;
                            return [4 /*yield*/, this.refundCaseRepo.save(refundCase)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 7, , 9]);
                            return [4 /*yield*/, this.refundProcessingService.processRefund(refundCase.paymentMethod, {
                                    orderId: refundCase.orderId,
                                    amount: Number(refundCase.amount),
                                    msisdn: refundCase.msisdn,
                                    accountNumber: refundCase.accountNumber,
                                })];
                        case 4:
                            refundResult = _a.sent();
                            // Update case with refund result
                            refundCase.refundStatus = refundResult.success
                                ? refund_case_entity_1.RefundStatus.SUCCESS
                                : refund_case_entity_1.RefundStatus.FAILED;
                            refundCase.refundDescription = refundResult.description;
                            refundCase.refundRawResponse = JSON.stringify(refundResult.rawResponse);
                            refundCase.refundProcessedAt = new Date();
                            refundCase.refundProcessedBy = (userContext === null || userContext === void 0 ? void 0 : userContext.username) || 'system';
                            refundCase.status = refundResult.success
                                ? refund_case_entity_1.RefundCaseStatus.COMPLETED
                                : refund_case_entity_1.RefundCaseStatus.FAILED;
                            return [4 /*yield*/, this.refundCaseRepo.save(refundCase)];
                        case 5:
                            _a.sent();
                            // Log refund processing
                            return [4 /*yield*/, this.auditLogsService.log({
                                    refundCaseId: refundCase.id,
                                    action: 'refunded',
                                    newValue: {
                                        refundStatus: refundCase.refundStatus,
                                        status: refundCase.status,
                                    },
                                    description: "Refund ".concat(refundResult.success ? 'successful' : 'failed', ": ").concat(refundResult.description),
                                    performedBy: refundCase.refundProcessedBy,
                                    ipAddress: userContext === null || userContext === void 0 ? void 0 : userContext.ip,
                                    userAgent: userContext === null || userContext === void 0 ? void 0 : userContext.userAgent,
                                })];
                        case 6:
                            // Log refund processing
                            _a.sent();
                            return [2 /*return*/, refundCase];
                        case 7:
                            error_1 = _a.sent();
                            this.logger.error("Refund processing error: ".concat(error_1.message));
                            // Update case with error
                            refundCase.refundStatus = refund_case_entity_1.RefundStatus.FAILED;
                            refundCase.refundDescription = "Error: ".concat(error_1.message);
                            refundCase.status = refund_case_entity_1.RefundCaseStatus.FAILED;
                            return [4 /*yield*/, this.refundCaseRepo.save(refundCase)];
                        case 8:
                            _a.sent();
                            throw error_1;
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Find all refund cases with filtering and pagination
         */
        RefundCasesService_1.prototype.findAll = function (queryDto) {
            return __awaiter(this, void 0, void 0, function () {
                var page, limit, skip, where, _a, data, total;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            page = parseInt(queryDto.page) || 1;
                            limit = parseInt(queryDto.limit) || 20;
                            skip = (page - 1) * limit;
                            where = {};
                            // Apply filters
                            if (queryDto.status) {
                                where.status = queryDto.status;
                            }
                            if (queryDto.verificationResult) {
                                where.verificationResult = queryDto.verificationResult;
                            }
                            if (queryDto.refundStatus) {
                                where.refundStatus = queryDto.refundStatus;
                            }
                            if (queryDto.paymentMethod) {
                                where.paymentMethod = queryDto.paymentMethod;
                            }
                            if (queryDto.search) {
                                // Search in case number or MSISDN
                                where.caseNumber = (0, typeorm_1.Like)("%".concat(queryDto.search, "%"));
                            }
                            if (queryDto.startDate && queryDto.endDate) {
                                where.createdAt = (0, typeorm_1.Between)(new Date(queryDto.startDate), new Date(queryDto.endDate));
                            }
                            return [4 /*yield*/, this.refundCaseRepo.findAndCount({
                                    where: where,
                                    skip: skip,
                                    take: limit,
                                    order: { createdAt: 'DESC' },
                                })];
                        case 1:
                            _a = _b.sent(), data = _a[0], total = _a[1];
                            return [2 /*return*/, { data: data, total: total, page: page, limit: limit }];
                    }
                });
            });
        };
        /**
         * Find one refund case by ID
         */
        RefundCasesService_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var refundCase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.refundCaseRepo.findOne({
                                where: { id: id },
                                relations: ['auditLogs', 'notifications', 'bulkOperation'],
                            })];
                        case 1:
                            refundCase = _a.sent();
                            if (!refundCase) {
                                throw new common_1.NotFoundException("Refund case with ID ".concat(id, " not found"));
                            }
                            return [2 /*return*/, refundCase];
                    }
                });
            });
        };
        /**
         * Find by case number
         */
        RefundCasesService_1.prototype.findByCaseNumber = function (caseNumber) {
            return __awaiter(this, void 0, void 0, function () {
                var refundCase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.refundCaseRepo.findOne({
                                where: { caseNumber: caseNumber },
                                relations: ['auditLogs', 'notifications', 'bulkOperation'],
                            })];
                        case 1:
                            refundCase = _a.sent();
                            if (!refundCase) {
                                throw new common_1.NotFoundException("Refund case with number ".concat(caseNumber, " not found"));
                            }
                            return [2 /*return*/, refundCase];
                    }
                });
            });
        };
        /**
         * Find all cases by bulk operation ID
         */
        RefundCasesService_1.prototype.findByBulkOperationId = function (bulkOperationId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.refundCaseRepo.find({
                            where: { bulkOperationId: bulkOperationId },
                            order: { createdAt: 'ASC' },
                        })];
                });
            });
        };
        /**
         * Generate unique case number (format: RC-YYYY-NNNNNN)
         */
        RefundCasesService_1.prototype.generateCaseNumber = function () {
            return __awaiter(this, void 0, void 0, function () {
                var year, prefix, lastCase, nextNumber, lastNumber;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            year = new Date().getFullYear();
                            prefix = "RC-".concat(year, "-");
                            return [4 /*yield*/, this.refundCaseRepo
                                    .createQueryBuilder('rc')
                                    .where('rc.case_number LIKE :prefix', { prefix: "".concat(prefix, "%") })
                                    .orderBy('rc.case_number', 'DESC')
                                    .getOne()];
                        case 1:
                            lastCase = _a.sent();
                            nextNumber = 1;
                            if (lastCase) {
                                lastNumber = parseInt(lastCase.caseNumber.split('-')[2]);
                                nextNumber = lastNumber + 1;
                            }
                            return [2 /*return*/, "".concat(prefix).concat(String(nextNumber).padStart(6, '0'))];
                    }
                });
            });
        };
        /**
         * Normalize MSISDN to 92xxx format
         */
        RefundCasesService_1.prototype.normalizeMsisdn = function (msisdn) {
            // Remove any spaces or dashes
            msisdn = msisdn.replace(/[\s-]/g, '');
            // Convert to 92xxx format
            if (msisdn.startsWith('0')) {
                return '92' + msisdn.substring(1);
            }
            else if (!msisdn.startsWith('92')) {
                return '92' + msisdn;
            }
            return msisdn;
        };
        return RefundCasesService_1;
    }());
    __setFunctionName(_classThis, "RefundCasesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RefundCasesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RefundCasesService = _classThis;
}();
exports.RefundCasesService = RefundCasesService;
