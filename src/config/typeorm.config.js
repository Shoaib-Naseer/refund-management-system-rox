"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceTypeOrmConfig = exports.typeOrmConfig = void 0;
// Primary database configuration (rox_refund_management)
var typeOrmConfig = function () { return ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false, // Always use migrations in production
    logging: process.env.NODE_ENV === 'development',
    charset: 'utf8mb4',
    timezone: '+05:00', // Pakistan Standard Time
}); };
exports.typeOrmConfig = typeOrmConfig;
// Source database configuration (rox_app - read-only)
var sourceTypeOrmConfig = function () { return ({
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
}); };
exports.sourceTypeOrmConfig = sourceTypeOrmConfig;
