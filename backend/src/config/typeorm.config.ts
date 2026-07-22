import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (): TypeOrmModuleOptions => {
  const dbType = (process.env.DB_TYPE || 'mysql') as any;
  if (dbType === 'sqlite') {
    return {
      type: 'sqlite',
      database: process.env.DB_DATABASE || 'database.sqlite',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: true, // Auto create tables for local sqlite testing
      logging: true,
    };
  }
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production', // Use synchronize locally for easier migration
    logging: process.env.NODE_ENV === 'development',
    charset: 'utf8mb4',
    timezone: '+05:00', // Pakistan Standard Time
  };
};

// Source database configuration (rox_app - read-only)
// retryAttempts: 0 — do NOT crash the app when the source DB is unreachable
// (e.g. off-VPN). Endpoints that use the source DataSource will return errors
// gracefully; all other routes (auth, cases, refund-requests) are unaffected.
export const sourceTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.SOURCE_DB_HOST || 'localhost',
  port: parseInt(process.env.SOURCE_DB_PORT) || 3306,
  username: process.env.SOURCE_DB_USERNAME,
  password: process.env.SOURCE_DB_PASSWORD,
  database: process.env.SOURCE_DB_DATABASE,
  entities: [__dirname + '/../modules/verification/entities/*.entity{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+05:00',
  retryAttempts: 0,       // Don't retry — fail fast, keep the app alive
  retryDelay: 0,
});
