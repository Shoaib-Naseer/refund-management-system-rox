"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefundTables1713000000001 = void 0;
var typeorm_1 = require("typeorm");
var CreateRefundTables1713000000001 = /** @class */ (function () {
    function CreateRefundTables1713000000001() {
        this.name = 'CreateRefundTables1713000000001';
    }
    CreateRefundTables1713000000001.prototype.up = function (queryRunner) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Create bulk_operations table first (for FK reference)
                    return [4 /*yield*/, queryRunner.createTable(new typeorm_1.Table({
                            name: 'bulk_operations',
                            columns: [
                                {
                                    name: 'id',
                                    type: 'bigint',
                                    unsigned: true,
                                    isPrimary: true,
                                    isGenerated: true,
                                    generationStrategy: 'increment',
                                },
                                {
                                    name: 'operation_number',
                                    type: 'varchar',
                                    length: '50',
                                    isUnique: true,
                                    isNullable: false,
                                },
                                {
                                    name: 'filename',
                                    type: 'varchar',
                                    length: '255',
                                    isNullable: true,
                                },
                                {
                                    name: 'total_cases',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'verified_cases',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'approved_cases',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'rejected_cases',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'processed_cases',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'successful_refunds',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'failed_refunds',
                                    type: 'int',
                                    default: 0,
                                },
                                {
                                    name: 'status',
                                    type: 'enum',
                                    enum: ['uploading', 'verifying', 'processing', 'completed', 'failed'],
                                    default: "'uploading'",
                                },
                                {
                                    name: 'progress_percentage',
                                    type: 'decimal',
                                    precision: 5,
                                    scale: 2,
                                    default: 0.0,
                                },
                                {
                                    name: 'result_file_path',
                                    type: 'varchar',
                                    length: '500',
                                    isNullable: true,
                                },
                                {
                                    name: 'error_message',
                                    type: 'text',
                                    isNullable: true,
                                },
                                {
                                    name: 'created_at',
                                    type: 'datetime',
                                    default: 'CURRENT_TIMESTAMP',
                                },
                                {
                                    name: 'updated_at',
                                    type: 'datetime',
                                    default: 'CURRENT_TIMESTAMP',
                                    onUpdate: 'CURRENT_TIMESTAMP',
                                },
                                {
                                    name: 'created_by',
                                    type: 'varchar',
                                    length: '100',
                                    isNullable: true,
                                },
                                {
                                    name: 'completed_at',
                                    type: 'datetime',
                                    isNullable: true,
                                },
                            ],
                            indices: [
                                {
                                    name: 'IDX_BULK_OPERATION_NUMBER',
                                    columnNames: ['operation_number'],
                                },
                                {
                                    name: 'IDX_BULK_STATUS',
                                    columnNames: ['status'],
                                },
                                {
                                    name: 'IDX_BULK_CREATED_AT',
                                    columnNames: ['created_at'],
                                },
                            ],
                        }), true)];
                    case 1:
                        // Create bulk_operations table first (for FK reference)
                        _a.sent();
                        // Create refund_cases table
                        return [4 /*yield*/, queryRunner.createTable(new typeorm_1.Table({
                                name: 'refund_cases',
                                columns: [
                                    {
                                        name: 'id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isPrimary: true,
                                        isGenerated: true,
                                        generationStrategy: 'increment',
                                    },
                                    {
                                        name: 'case_number',
                                        type: 'varchar',
                                        length: '50',
                                        isUnique: true,
                                        isNullable: false,
                                    },
                                    {
                                        name: 'msisdn',
                                        type: 'varchar',
                                        length: '15',
                                        isNullable: false,
                                    },
                                    {
                                        name: 'amount',
                                        type: 'decimal',
                                        precision: 10,
                                        scale: 2,
                                        isNullable: false,
                                    },
                                    {
                                        name: 'payment_method',
                                        type: 'enum',
                                        enum: ['Easy_Paisa', 'Jazz_Cash', 'Card'],
                                        isNullable: false,
                                    },
                                    {
                                        name: 'account_number',
                                        type: 'varchar',
                                        length: '255',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'package_code',
                                        type: 'varchar',
                                        length: '100',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'order_id',
                                        type: 'varchar',
                                        length: '255',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'transaction_datetime',
                                        type: 'datetime',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'source_transaction_id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isNullable: true,
                                    },
                                    {
                                        name: 'source_snapshot',
                                        type: 'json',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'status',
                                        type: 'enum',
                                        enum: ['pending', 'verified', 'rejected', 'processing', 'completed', 'failed'],
                                        default: "'pending'",
                                    },
                                    {
                                        name: 'verification_result',
                                        type: 'enum',
                                        enum: ['approved', 'rejected', 'not_found'],
                                        isNullable: true,
                                    },
                                    {
                                        name: 'verification_comment',
                                        type: 'text',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'eligibility_checks',
                                        type: 'json',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'verified_at',
                                        type: 'datetime',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'verified_by',
                                        type: 'varchar',
                                        length: '100',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'refund_status',
                                        type: 'enum',
                                        enum: ['not_processed', 'success', 'failed', 'pending'],
                                        default: "'not_processed'",
                                    },
                                    {
                                        name: 'refund_description',
                                        type: 'text',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'refund_raw_response',
                                        type: 'text',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'refund_processed_at',
                                        type: 'datetime',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'refund_processed_by',
                                        type: 'varchar',
                                        length: '100',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'bulk_operation_id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isNullable: true,
                                    },
                                    {
                                        name: 'created_at',
                                        type: 'datetime',
                                        default: 'CURRENT_TIMESTAMP',
                                    },
                                    {
                                        name: 'updated_at',
                                        type: 'datetime',
                                        default: 'CURRENT_TIMESTAMP',
                                        onUpdate: 'CURRENT_TIMESTAMP',
                                    },
                                    {
                                        name: 'created_by',
                                        type: 'varchar',
                                        length: '100',
                                        isNullable: true,
                                    },
                                ],
                                indices: [
                                    {
                                        name: 'IDX_CASE_NUMBER',
                                        columnNames: ['case_number'],
                                    },
                                    {
                                        name: 'IDX_MSISDN',
                                        columnNames: ['msisdn'],
                                    },
                                    {
                                        name: 'IDX_ORDER_ID',
                                        columnNames: ['order_id'],
                                    },
                                    {
                                        name: 'IDX_STATUS',
                                        columnNames: ['status'],
                                    },
                                    {
                                        name: 'IDX_CREATED_AT',
                                        columnNames: ['created_at'],
                                    },
                                    {
                                        name: 'IDX_BULK_OPERATION_ID',
                                        columnNames: ['bulk_operation_id'],
                                    },
                                ],
                                foreignKeys: [
                                    {
                                        name: 'FK_REFUND_CASE_BULK_OPERATION',
                                        columnNames: ['bulk_operation_id'],
                                        referencedTableName: 'bulk_operations',
                                        referencedColumnNames: ['id'],
                                        onDelete: 'SET NULL',
                                    },
                                ],
                            }), true)];
                    case 2:
                        // Create refund_cases table
                        _a.sent();
                        // Create refund_audit_logs table
                        return [4 /*yield*/, queryRunner.createTable(new typeorm_1.Table({
                                name: 'refund_audit_logs',
                                columns: [
                                    {
                                        name: 'id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isPrimary: true,
                                        isGenerated: true,
                                        generationStrategy: 'increment',
                                    },
                                    {
                                        name: 'refund_case_id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isNullable: false,
                                    },
                                    {
                                        name: 'action',
                                        type: 'varchar',
                                        length: '50',
                                        isNullable: false,
                                    },
                                    {
                                        name: 'old_value',
                                        type: 'json',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'new_value',
                                        type: 'json',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'description',
                                        type: 'text',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'performed_by',
                                        type: 'varchar',
                                        length: '100',
                                        isNullable: false,
                                    },
                                    {
                                        name: 'ip_address',
                                        type: 'varchar',
                                        length: '45',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'user_agent',
                                        type: 'text',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'performed_at',
                                        type: 'datetime',
                                        default: 'CURRENT_TIMESTAMP',
                                    },
                                ],
                                indices: [
                                    {
                                        name: 'IDX_AUDIT_REFUND_CASE_ID',
                                        columnNames: ['refund_case_id'],
                                    },
                                    {
                                        name: 'IDX_AUDIT_PERFORMED_AT',
                                        columnNames: ['performed_at'],
                                    },
                                    {
                                        name: 'IDX_AUDIT_ACTION',
                                        columnNames: ['action'],
                                    },
                                ],
                                foreignKeys: [
                                    {
                                        name: 'FK_AUDIT_LOG_REFUND_CASE',
                                        columnNames: ['refund_case_id'],
                                        referencedTableName: 'refund_cases',
                                        referencedColumnNames: ['id'],
                                        onDelete: 'CASCADE',
                                    },
                                ],
                            }), true)];
                    case 3:
                        // Create refund_audit_logs table
                        _a.sent();
                        // Create refund_notifications table
                        return [4 /*yield*/, queryRunner.createTable(new typeorm_1.Table({
                                name: 'refund_notifications',
                                columns: [
                                    {
                                        name: 'id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isPrimary: true,
                                        isGenerated: true,
                                        generationStrategy: 'increment',
                                    },
                                    {
                                        name: 'refund_case_id',
                                        type: 'bigint',
                                        unsigned: true,
                                        isNullable: false,
                                    },
                                    {
                                        name: 'notification_type',
                                        type: 'enum',
                                        enum: ['sms', 'email'],
                                        isNullable: false,
                                    },
                                    {
                                        name: 'recipient',
                                        type: 'varchar',
                                        length: '255',
                                        isNullable: false,
                                    },
                                    {
                                        name: 'message',
                                        type: 'text',
                                        isNullable: false,
                                    },
                                    {
                                        name: 'status',
                                        type: 'enum',
                                        enum: ['pending', 'sent', 'failed', 'retry'],
                                        default: "'pending'",
                                    },
                                    {
                                        name: 'error_message',
                                        type: 'text',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'retry_count',
                                        type: 'int',
                                        default: 0,
                                    },
                                    {
                                        name: 'sent_at',
                                        type: 'datetime',
                                        isNullable: true,
                                    },
                                    {
                                        name: 'created_at',
                                        type: 'datetime',
                                        default: 'CURRENT_TIMESTAMP',
                                    },
                                ],
                                indices: [
                                    {
                                        name: 'IDX_NOTIFICATION_REFUND_CASE_ID',
                                        columnNames: ['refund_case_id'],
                                    },
                                    {
                                        name: 'IDX_NOTIFICATION_STATUS',
                                        columnNames: ['status'],
                                    },
                                    {
                                        name: 'IDX_NOTIFICATION_CREATED_AT',
                                        columnNames: ['created_at'],
                                    },
                                ],
                                foreignKeys: [
                                    {
                                        name: 'FK_NOTIFICATION_REFUND_CASE',
                                        columnNames: ['refund_case_id'],
                                        referencedTableName: 'refund_cases',
                                        referencedColumnNames: ['id'],
                                        onDelete: 'CASCADE',
                                    },
                                ],
                            }), true)];
                    case 4:
                        // Create refund_notifications table
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CreateRefundTables1713000000001.prototype.down = function (queryRunner) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Drop tables in reverse order (respecting FK constraints)
                    return [4 /*yield*/, queryRunner.dropTable('refund_notifications', true)];
                    case 1:
                        // Drop tables in reverse order (respecting FK constraints)
                        _a.sent();
                        return [4 /*yield*/, queryRunner.dropTable('refund_audit_logs', true)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.dropTable('refund_cases', true)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, queryRunner.dropTable('bulk_operations', true)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return CreateRefundTables1713000000001;
}());
exports.CreateRefundTables1713000000001 = CreateRefundTables1713000000001;
