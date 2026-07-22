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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
var common_1 = require("@nestjs/common");
var VerificationService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var VerificationService = _classThis = /** @class */ (function () {
        function VerificationService_1(sourceDataSource) {
            this.sourceDataSource = sourceDataSource;
            this.logger = new common_1.Logger(VerificationService.name);
        }
        /**
         * Verify a complaint against Fintech Era, Legacy Fulfillment, and Legacy Journey.
         * Mirrors the logic from scripts/refund-tools/complaint-verification/index.ts
         */
        VerificationService_1.prototype.verifyComplaint = function (msisdn, amount, date) {
            return __awaiter(this, void 0, void 0, function () {
                var results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Verifying complaint for MSISDN: ".concat(msisdn, ", Amount: ").concat(amount));
                            return [4 /*yield*/, this.verifyFintechEra(msisdn, amount)];
                        case 1:
                            results = _a.sent();
                            if (!(results.length === 0)) return [3 /*break*/, 3];
                            this.logger.log("No records found in Era 3. Checking Era 2 for ".concat(msisdn, "..."));
                            return [4 /*yield*/, this.verifyLegacyFulfillmentEra(msisdn, amount)];
                        case 2:
                            results = _a.sent();
                            _a.label = 3;
                        case 3:
                            if (!(results.length === 0)) return [3 /*break*/, 5];
                            this.logger.log("No records found in Era 2. Checking Era 1 for ".concat(msisdn, "..."));
                            return [4 /*yield*/, this.verifyLegacyJourneyEra(msisdn, amount)];
                        case 4:
                            results = _a.sent();
                            _a.label = 5;
                        case 5:
                            if (results.length === 0) {
                                this.logger.warn("No payment record found across any era for MSISDN: ".concat(msisdn));
                            }
                            return [2 /*return*/, results];
                    }
                });
            });
        };
        VerificationService_1.prototype.verifyFintechEra = function (msisdn, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var query, params, rows, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            query = "\n      SELECT id as \"paymentId\", amount as \"amountDeducted\", status as \"paymentStatus\", package_posted as \"packagePosted\",\n             actual_refund_amount as \"actualRefundAmount\", refund_eligibility as \"refundEligibility\"\n      FROM fintech_records \n      WHERE msisdn = $1 \n      ".concat(amount ? 'AND amount = $2' : '', "\n    ");
                            params = amount ? [msisdn, amount] : [msisdn];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.sourceDataSource.query(query, params)];
                        case 2:
                            rows = _a.sent();
                            return [2 /*return*/, rows.map(function (r) { return ({
                                    era: 3,
                                    paymentId: r.paymentId,
                                    amountDeducted: Number(r.amountDeducted),
                                    paymentStatus: r.paymentStatus,
                                    packagePosted: r.packagePosted,
                                    refundEligibility: r.refundEligibility,
                                    actualRefundAmount: Number(r.actualRefundAmount),
                                }); })];
                        case 3:
                            e_1 = _a.sent();
                            this.logger.error("Error querying Era 3: ".concat(e_1.message));
                            return [2 /*return*/, []];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        VerificationService_1.prototype.verifyLegacyFulfillmentEra = function (msisdn, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var msisdnVariants, query, records, results, _i, records_1, row, price, dbPayStatus, dbFulfillStatus, isPaid, packagePosted, refundEligibility, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("[Era 2] Starting verification for ".concat(msisdn, ", amount: ").concat(amount, "..."));
                            msisdnVariants = [msisdn, msisdn.replace(/^92/, '0')];
                            query = "\n      SELECT transaction_id as \"transactionId\", mobile_number as \"mobileNumber\", \n             fulfillment_price as \"fulfillmentPrice\", payment_status as \"paymentStatus\", \n             payment_gateway_ref as \"paymentGatewayRef\", amount_deducted as \"amountDeducted\", \n             fulfillment_status as \"fulfillmentStatus\", metadata, created_at as \"createdAt\"\n      FROM rox_app.subscription_fulfillment_requests\n      WHERE mobile_number IN ($1, $2)\n      ORDER BY created_at DESC\n    ";
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.sourceDataSource.query(query, msisdnVariants)];
                        case 2:
                            records = _a.sent();
                            if (records.length === 0) {
                                return [2 /*return*/, []];
                            }
                            results = [];
                            for (_i = 0, records_1 = records; _i < records_1.length; _i++) {
                                row = records_1[_i];
                                price = Number(row.amountDeducted || row.fulfillmentPrice);
                                dbPayStatus = String(row.paymentStatus || "").toUpperCase();
                                dbFulfillStatus = String(row.fulfillmentStatus || "").toUpperCase();
                                // Simple amount match
                                if (amount !== null && Math.abs(price - amount) >= 0.01) {
                                    continue;
                                }
                                isPaid = dbPayStatus === "SUCCESS" || dbPayStatus === "PAID" || dbPayStatus === "VERIFIED";
                                if (!isPaid)
                                    continue;
                                packagePosted = (dbFulfillStatus === "SUCCESS" || dbFulfillStatus === "RECHARGE_POSTED") ? "Yes" : "No";
                                refundEligibility = packagePosted === "No" ? "Eligible" : "Ineligible";
                                results.push({
                                    era: 2,
                                    paymentId: row.paymentGatewayRef || row.transactionId,
                                    amountDeducted: price,
                                    paymentStatus: dbPayStatus,
                                    packagePosted: packagePosted,
                                    refundEligibility: refundEligibility,
                                    actualRefundAmount: packagePosted === "No" ? price : 0,
                                });
                            }
                            return [2 /*return*/, results];
                        case 3:
                            e_2 = _a.sent();
                            this.logger.error("Error querying Era 2: ".concat(e_2.message));
                            return [2 /*return*/, []];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        VerificationService_1.prototype.verifyLegacyJourneyEra = function (msisdn, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var msisdnVariants, results, epQuery, epRecords, _i, epRecords_1, row, txAmount, dbStatus, isPaid, packagePosted, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("[Era 1] Starting verification for ".concat(msisdn, ", amount: ").concat(amount, "..."));
                            msisdnVariants = [msisdn, msisdn.replace(/^92/, '0')];
                            results = [];
                            epQuery = "\n      SELECT id, orderId, transactionAmount, paymentStatus, createdAt\n      FROM rox_easypaisa.easypaisa_transactions\n      WHERE mobileAccountNo IN ($1, $2) OR msisdn IN ($1, $2)\n      ORDER BY createdAt DESC\n    ";
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.sourceDataSource.query(epQuery, __spreadArray([], msisdnVariants, true))];
                        case 2:
                            epRecords = _a.sent();
                            for (_i = 0, epRecords_1 = epRecords; _i < epRecords_1.length; _i++) {
                                row = epRecords_1[_i];
                                txAmount = Number(row.transactionAmount);
                                if (amount !== null && Math.abs(txAmount - amount) >= 0.01)
                                    continue;
                                dbStatus = String(row.paymentStatus || "").toUpperCase();
                                isPaid = dbStatus === "SUCCESS" || dbStatus === "COMPLETED" || dbStatus === "VERIFIED";
                                if (!isPaid)
                                    continue;
                                packagePosted = "No";
                                results.push({
                                    era: 1,
                                    paymentId: row.orderId || row.id,
                                    amountDeducted: txAmount,
                                    paymentStatus: dbStatus,
                                    packagePosted: packagePosted,
                                    refundEligibility: "Eligible",
                                    actualRefundAmount: txAmount,
                                });
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            e_3 = _a.sent();
                            this.logger.error("Error querying Era 1: ".concat(e_3.message));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, results];
                    }
                });
            });
        };
        return VerificationService_1;
    }());
    __setFunctionName(_classThis, "VerificationService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VerificationService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VerificationService = _classThis;
}();
exports.VerificationService = VerificationService;
