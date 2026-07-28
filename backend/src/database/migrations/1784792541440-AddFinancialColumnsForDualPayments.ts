import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFinancialColumnsForDualPayments1784792541440 implements MigrationInterface {
  name = 'AddFinancialColumnsForDualPayments1784792541440';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add balance_charge_amount and external_charge_amount to refund_cases
    await queryRunner.addColumn(
      'refund_cases',
      new TableColumn({
        name: 'balance_charge_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'refund_cases',
      new TableColumn({
        name: 'external_charge_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );

    // 2. Add balance_charge_amount and external_charge_amount to refund_requests
    await queryRunner.addColumn(
      'refund_requests',
      new TableColumn({
        name: 'balance_charge_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'refund_requests',
      new TableColumn({
        name: 'external_charge_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('refund_requests', 'external_charge_amount');
    await queryRunner.dropColumn('refund_requests', 'balance_charge_amount');
    await queryRunner.dropColumn('refund_cases', 'external_charge_amount');
    await queryRunner.dropColumn('refund_cases', 'balance_charge_amount');
  }
}
