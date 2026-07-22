"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefundTables1713000000001 = void 0;
const typeorm_1 = require("typeorm");
class CreateRefundTables1713000000001 {
    constructor() {
        this.name = 'CreateRefundTables1713000000001';
    }
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('refund_notifications', true);
        await queryRunner.dropTable('refund_audit_logs', true);
        await queryRunner.dropTable('refund_cases', true);
        await queryRunner.dropTable('bulk_operations', true);
    }
}
exports.CreateRefundTables1713000000001 = CreateRefundTables1713000000001;
//# sourceMappingURL=1713000000001-CreateRefundTables.js.map