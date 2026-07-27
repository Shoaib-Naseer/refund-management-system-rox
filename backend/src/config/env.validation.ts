import * as Joi from 'joi';

/**
 * Validated once against process.env at ConfigModule.forRoot() bootstrap
 * (see app.module.ts). The app exits immediately with a clear error if a
 * required variable is missing/invalid, instead of failing silently the
 * first time a gateway call or DB query is made with an undefined value.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  PKT_TIMEZONE: Joi.string().default('Asia/Karachi'),

  // Primary database
  DB_TYPE: Joi.string().valid('mysql', 'sqlite').default('mysql'),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().when('DB_TYPE', { is: 'mysql', then: Joi.required() }),
  DB_PASSWORD: Joi.string().allow('').when('DB_TYPE', { is: 'mysql', then: Joi.required() }),
  DB_DATABASE: Joi.string().default('database.sqlite'),

  // Source (read-only) database
  SOURCE_DB_HOST: Joi.string().default('localhost'),
  SOURCE_DB_PORT: Joi.number().default(3306),
  SOURCE_DB_USERNAME: Joi.string().allow('').optional(),
  SOURCE_DB_PASSWORD: Joi.string().allow('').optional(),
  SOURCE_DB_DATABASE: Joi.string().allow('').optional(),

  // Redis (Bull queue)
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Auth
  JWT_SECRET: Joi.string().default('dev-only-change-me-in-production'),
  JWT_EXPIRES_IN: Joi.string().default('8h'),

  // Notifications
  NOTIFICATIONS_SERVICE_URL: Joi.string().uri().default('http://localhost:3005'),

  // Easypaisa inquiry gateway
  EASYPAISA_STORE_ID: Joi.string().required(),
  EASYPAISA_CREDENTIALS: Joi.string().optional(),
  EASYPAISA_ACCOUNT_NUM: Joi.string().required(),
  EASYPAISA_INQUIRY_API_URL: Joi.string().uri().optional(),
  EASYPAISA_INQUIRY_URL: Joi.string().uri().optional(),

  // Easypaisa refund gateway
  EASYPAISA_PASSWORD: Joi.string().allow('').optional(),
  EASYPAISA_AUTH_TOKEN: Joi.string().allow('').optional(),
  EASYPAISA_TOKEN: Joi.string().allow('').optional(),
  JAZZ_EASYPAISA_TOKEN_KEY: Joi.string().allow('').optional(),
  EASYPAISA_REFUND_API_URL: Joi.string().uri().allow('').optional(),
  EASYPAISA_REFUND_PRIVATE_KEY: Joi.string().allow('').optional(),
  EASYPAISA_PRIVATE_KEY: Joi.string().allow('').optional(),

  // JazzCash
  JAZZCASH_MERCHANT_ID: Joi.string().required(),
  JAZZCASH_PASSWORD: Joi.string().required(),
  JAZZCASH_MERCHANT_MPIN: Joi.string().allow('').optional(),
  JAZZCASH_INTEGRITY_SALT: Joi.string().optional(),
  JAZZCASH_SALT: Joi.string().optional(),
  JAZZCASH_CURRENCY: Joi.string().optional().default('PKR'),
  JAZZCASH_BASE_URL: Joi.string().uri().optional(),
  JAZZCASH_INQUIRY_API_URL: Joi.string().uri().optional(),
  JAZZCASH_REFUND_API_URL: Joi.string().uri().allow('').optional(),
  JAZZCASH_CARD_REFUND_API_URL: Joi.string().uri().allow('').optional(),
  JAZZCASH_ORCHESTRATOR_URL: Joi.string().uri().optional(),
}).unknown(true);
