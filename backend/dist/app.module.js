"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const typeorm_2 = require("typeorm");
const typeorm_config_1 = require("./config/typeorm.config");
const refund_cases_module_1 = require("./modules/refund-cases/refund-cases.module");
const verification_module_1 = require("./modules/verification/verification.module");
const refund_processing_module_1 = require("./modules/refund-processing/refund-processing.module");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const history_module_1 = require("./modules/history/history.module");
const auth_module_1 = require("./modules/auth/auth.module");
const refund_requests_module_1 = require("./modules/refund-requests/refund-requests.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const users_module_1 = require("./modules/users/users.module");
const roles_module_1 = require("./modules/roles/roles.module");
let SourceDatabaseModule = class SourceDatabaseModule {
};
SourceDatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: 'SOURCE_DATA_SOURCE',
                useFactory: async () => {
                    const cfg = (0, typeorm_config_1.sourceTypeOrmConfig)();
                    delete cfg.retryAttempts;
                    delete cfg.retryDelay;
                    const ds = new typeorm_2.DataSource(cfg);
                    try {
                        await ds.initialize();
                        console.log('[SourceDB] Connected to source database successfully');
                    }
                    catch (err) {
                        console.warn(`[SourceDB] Could not connect to source database (off-VPN?): ${err.message}. ` +
                            'History/Subscriptions endpoints will fail until DB is reachable.');
                    }
                    return ds;
                },
            },
        ],
        exports: ['SOURCE_DATA_SOURCE'],
    })
], SourceDatabaseModule);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            bull_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    redis: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                    },
                }),
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: typeorm_config_1.typeOrmConfig,
            }),
            SourceDatabaseModule,
            refund_cases_module_1.RefundCasesModule,
            verification_module_1.VerificationModule,
            refund_processing_module_1.RefundProcessingModule,
            audit_logs_module_1.AuditLogsModule,
            history_module_1.HistoryModule,
            auth_module_1.AuthModule,
            refund_requests_module_1.RefundRequestsModule,
            subscriptions_module_1.SubscriptionsModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map