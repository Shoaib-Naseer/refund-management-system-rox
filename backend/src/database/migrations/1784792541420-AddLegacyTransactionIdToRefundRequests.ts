import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds refund_requests.legacy_transaction_id — Era 2's
 * rox_app.subscription_fulfillment_requests.transaction_id (HistoryRecord.tid),
 * frozen at request-creation time alongside the other source-transaction
 * identity columns (order_id, payment_order_id, etc.).
 */
export class AddLegacyTransactionIdToRefundRequests1784792541420 implements MigrationInterface {
  name = 'AddLegacyTransactionIdToRefundRequests1784792541420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'refund_requests',
      new TableColumn({
        name: 'legacy_transaction_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('refund_requests', 'legacy_transaction_id');
  }
}
