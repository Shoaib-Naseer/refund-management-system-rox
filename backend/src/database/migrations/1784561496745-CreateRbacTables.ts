import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

/**
 * Introduces relational RBAC (roles, permissions, and their join tables)
 * alongside the existing `users.role` enum column. The enum column is left
 * in place and untouched — every existing user is backfilled into
 * `user_roles` with the equivalent role, so behavior is identical before
 * and after this migration. Dropping `users.role` is a deliberately
 * separate, later migration once the new tables are verified in production.
 */
export class CreateRbacTables1784561496745 implements MigrationInterface {
  name = 'CreateRbacTables1784561496745';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'int',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
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
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'int',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          { name: 'role_id', type: 'int', unsigned: true, isPrimary: true },
          { name: 'permission_id', type: 'int', unsigned: true, isPrimary: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_ROLE_PERMISSIONS_ROLE',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_ROLE_PERMISSIONS_PERMISSION',
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          { name: 'user_id', type: 'int', unsigned: true, isPrimary: true },
          { name: 'role_id', type: 'int', unsigned: true, isPrimary: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_USER_ROLES_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_USER_ROLES_ROLE',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ── Seed: 3 default roles (same names as the existing `role` enum) ──
    await queryRunner.query(
      `INSERT INTO roles (name, description) VALUES
        ('agent', 'Can submit refund requests'),
        ('reviewer', 'Can review, approve, and reject refund requests'),
        ('admin', 'Full access, including override-approval and user/role management')`,
    );

    // ── Seed: minimal permission catalog — only what's actually enforced today ──
    await queryRunner.query(
      `INSERT INTO permissions (name, description) VALUES
        ('refund_requests.review', 'Approve/reject refund requests, including bulk review and bulk create-and-refund, and view the pending review queue'),
        ('refund_requests.read_all', 'View the full refund-requests queue across all agents'),
        ('refund_requests.override_approve', 'Review requests that required an eligibility override; also gates the Users/Roles admin screens')`,
    );

    // ── Map: reviewer gets review; admin gets everything; agent gets nothing extra ──
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'reviewer' AND p.name = 'refund_requests.review'`,
    );
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'admin'`,
    );

    // ── Backfill: every existing user keeps exactly the access they have today ──
    await queryRunner.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u JOIN roles r ON r.name = u.role`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_roles', true);
    await queryRunner.dropTable('role_permissions', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('roles', true);
  }
}
