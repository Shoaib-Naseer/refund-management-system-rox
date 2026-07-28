import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterRefundCasesPaymentMethod1784792541430 implements MigrationInterface {
  name = 'AlterRefundCasesPaymentMethod1784792541430';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Alter refund_cases.payment_method from enum to varchar(50)
    await queryRunner.query(
      `ALTER TABLE \`refund_cases\` MODIFY \`payment_method\` VARCHAR(50) NULL`
    );

    // 2. Add payment_mode column to refund_cases
    await queryRunner.addColumn(
      'refund_cases',
      new TableColumn({
        name: 'payment_mode',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'single'",
      }),
    );

    // 3. Add payment_mode column to refund_requests
    await queryRunner.addColumn(
      'refund_requests',
      new TableColumn({
        name: 'payment_mode',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'single'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert payment_mode columns
    await queryRunner.dropColumn('refund_requests', 'payment_mode');
    await queryRunner.dropColumn('refund_cases', 'payment_mode');

    // Revert payment_method back to enum
    await queryRunner.query(
      `ALTER TABLE \`refund_cases\` MODIFY \`payment_method\` ENUM('Easy_Paisa', 'Jazz_Cash', 'Card') NULL`
    );
  }
}
