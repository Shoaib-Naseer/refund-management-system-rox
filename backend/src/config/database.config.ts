import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  primary: {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  // Read-only source DB (rox_app / fintech_records). Allowed to be
  // unreachable — SourceDatabaseModule degrades gracefully (see app.module.ts).
  source: {
    host: process.env.SOURCE_DB_HOST,
    port: parseInt(process.env.SOURCE_DB_PORT, 10),
    username: process.env.SOURCE_DB_USERNAME,
    password: process.env.SOURCE_DB_PASSWORD,
    database: process.env.SOURCE_DB_DATABASE,
  },
}));
