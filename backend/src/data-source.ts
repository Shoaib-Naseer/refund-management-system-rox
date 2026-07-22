import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Standalone DataSource for the TypeORM CLI (migration:run / migration:revert).
 * Deliberately separate from typeorm.config.ts's forRootAsync factory (which
 * the running app uses, with synchronize on for local/dev) — migrations
 * should always run with synchronize off, exactly like production.
 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, 'entities/**/*.entity.ts')],
  // NOTE: src/database/migrations/ has a stray compiled .js sitting next to
  // its .ts source for one older migration — restrict to .ts (we run this
  // via ts-node) so the CLI doesn't see the same migration class twice.
  migrations: [path.join(__dirname, 'database/migrations/*.ts')],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: '+05:00',
});
