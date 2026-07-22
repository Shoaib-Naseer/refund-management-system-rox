"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceTypeOrmConfig = exports.typeOrmConfig = void 0;
const typeOrmConfig = () => {
    const dbType = (process.env.DB_TYPE || 'mysql');
    if (dbType === 'sqlite') {
        return {
            type: 'sqlite',
            database: process.env.DB_DATABASE || 'database.sqlite',
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
            synchronize: true,
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
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        charset: 'utf8mb4',
        timezone: '+05:00',
    };
};
exports.typeOrmConfig = typeOrmConfig;
const sourceTypeOrmConfig = () => ({
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
    retryAttempts: 0,
    retryDelay: 0,
});
exports.sourceTypeOrmConfig = sourceTypeOrmConfig;
//# sourceMappingURL=typeorm.config.js.map