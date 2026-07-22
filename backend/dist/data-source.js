"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, '../.env') });
exports.default = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [path.join(__dirname, 'entities/**/*.entity.ts')],
    migrations: [path.join(__dirname, 'database/migrations/*.ts')],
    synchronize: false,
    charset: 'utf8mb4',
    timezone: '+05:00',
});
//# sourceMappingURL=data-source.js.map