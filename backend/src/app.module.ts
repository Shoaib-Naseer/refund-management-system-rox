import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import { typeOrmConfig, sourceTypeOrmConfig } from './config/typeorm.config';
import { RefundCasesModule } from './modules/refund-cases/refund-cases.module';
import { VerificationModule } from './modules/verification/verification.module';
import { RefundProcessingModule } from './modules/refund-processing/refund-processing.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HistoryModule } from './modules/history/history.module';
import { AuthModule } from './modules/auth/auth.module';
import { RefundRequestsModule } from './modules/refund-requests/refund-requests.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';

/**
 * @Global module that registers the source (read-only) DataSource as a lazy
 * provider. The app does NOT crash on startup when the source DB is
 * unreachable (e.g. off-VPN). Any service that injects SOURCE_DATA_SOURCE
 * will get the DataSource object; individual queries will fail gracefully
 * until the DB is reachable.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'SOURCE_DATA_SOURCE',
      useFactory: async () => {
        const cfg = sourceTypeOrmConfig() as any;
        // Strip NestJS-specific retry keys — raw DataSource doesn't know them
        delete cfg.retryAttempts;
        delete cfg.retryDelay;
        const ds = new DataSource(cfg);
        try {
          await ds.initialize();
          console.log('[SourceDB] Connected to source database successfully');
        } catch (err) {
          console.warn(
            `[SourceDB] Could not connect to source database (off-VPN?): ${err.message}. ` +
              'History/Subscriptions endpoints will fail until DB is reachable.',
          );
        }
        return ds;
      },
    },
  ],
  exports: ['SOURCE_DATA_SOURCE'],
})
class SourceDatabaseModule {}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Bull Queue — reads REDIS_HOST / REDIS_PORT / REDIS_PASSWORD from .env via ConfigService
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // Primary Database (rox_refund_management - SQLite locally)
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),

    // Source Database — lazy + non-fatal (see SourceDatabaseModule above)
    SourceDatabaseModule,

    // Feature Modules
    RefundCasesModule,
    VerificationModule,
    RefundProcessingModule,
    AuditLogsModule,
    HistoryModule,
    AuthModule,
    RefundRequestsModule,
    SubscriptionsModule,
    UsersModule,
    RolesModule,
  ],
})
export class AppModule {}
