import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import all entities
import { User } from '../src/entities/user.entity';
import { RefundCase } from '../src/entities/refund-case.entity';
import { RefundRequest } from '../src/entities/refund-request.entity';
import { RefundAuditLog } from '../src/entities/refund-audit-log.entity';
import { RefundNotification } from '../src/entities/refund-notification.entity';
import { BulkOperation } from '../src/entities/bulk-operation.entity';

const entities = [
  User,
  BulkOperation,
  RefundCase,
  RefundRequest,
  RefundAuditLog,
  RefundNotification,
];

async function migrate() {
  console.log('Starting migration from SQLite to MySQL...');

  // 1. Connect to SQLite (Source)
  const sqliteDs = new DataSource({
    type: 'sqlite',
    database: path.join(__dirname, '../rox_refund_management.sqlite'),
    entities,
  });
  await sqliteDs.initialize();
  console.log('Connected to SQLite');

  // 2. Connect to MySQL (Destination)
  const mysqlDs = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'localuser',
    password: 'localpassword',
    database: 'rox_refund_management',
    entities,
    synchronize: true, // Auto-create tables if they don't exist
  });
  await mysqlDs.initialize();
  console.log('Connected to MySQL and synchronized schema');

  // Helper to migrate a single table
  async function migrateTable(entity: any, name: string) {
    console.log(`Migrating ${name}...`);
    const sourceRepo = sqliteDs.getRepository(entity);
    const targetRepo = mysqlDs.getRepository(entity);

    const records = await sourceRepo.find();
    console.log(`Found ${records.length} records in ${name}`);

    if (records.length > 0) {
      // Clear target table first
      await targetRepo.query(`SET FOREIGN_KEY_CHECKS = 0;`);
      await targetRepo.clear();
      await targetRepo.query(`SET FOREIGN_KEY_CHECKS = 1;`);

      // Insert in chunks to avoid memory/packet limits
      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        
        // Handle sqlite boolean to mysql tinyint conversion if needed, 
        // TypeORM should handle this automatically when saving via repository
        await targetRepo.save(chunk);
      }
      console.log(`Successfully migrated ${records.length} records for ${name}`);
    }
  }

  try {
    // 3. Migrate tables in order (respect foreign keys)
    await migrateTable(User, 'User');
    await migrateTable(BulkOperation, 'BulkOperation');
    await migrateTable(RefundCase, 'RefundCase');
    await migrateTable(RefundRequest, 'RefundRequest');
    await migrateTable(RefundAuditLog, 'RefundAuditLog');
    await migrateTable(RefundNotification, 'RefundNotification');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sqliteDs.destroy();
    await mysqlDs.destroy();
  }
}

migrate();
