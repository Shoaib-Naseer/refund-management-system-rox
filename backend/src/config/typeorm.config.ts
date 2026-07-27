import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const db = configService.get('database.primary');
  const nodeEnv = configService.get<string>('app.nodeEnv');

  if (db.type === 'sqlite') {
    return {
      type: 'sqlite',
      database: db.database,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: true, // Auto create tables for local sqlite testing
      logging: true,
    };
  }
  return {
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: nodeEnv !== 'production', // Use synchronize locally for easier migration
    logging: nodeEnv === 'development',
    charset: 'utf8mb4',
    timezone: '+05:00', // Pakistan Standard Time
  };
};

// Source database configuration (rox_app - read-only)
// retryAttempts: 0 — do NOT crash the app when the source DB is unreachable
// (e.g. off-VPN). Endpoints that use the source DataSource will return errors
// gracefully; all other routes (auth, cases, refund-requests) are unaffected.
export const sourceTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const source = configService.get('database.source');
  const nodeEnv = configService.get<string>('app.nodeEnv');

  return {
    type: 'mysql',
    host: source.host,
    port: source.port,
    username: source.username,
    password: source.password,
    database: source.database,
    entities: [__dirname + '/../modules/verification/entities/*.entity{.ts,.js}'],
    synchronize: false,
    logging: nodeEnv === 'development',
    charset: 'utf8mb4',
    timezone: '+05:00',
    retryAttempts: 0, // Don't retry — fail fast, keep the app alive
    retryDelay: 0,
  };
};
