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
    .required(),
  PORT: Joi.number().required(),
  PKT_TIMEZONE: Joi.string().required(),

  // Primary database
  DB_TYPE: Joi.string().valid('mysql', 'sqlite').required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().when('DB_TYPE', { is: 'mysql', then: Joi.required() }),
  DB_PASSWORD: Joi.string().allow('').when('DB_TYPE', { is: 'mysql', then: Joi.required() }),
  DB_DATABASE: Joi.string().required(),

  // Source (read-only) database — allowed to be absent; SourceDatabaseModule
  // degrades gracefully when unreachable, so these are optional, not required.
  SOURCE_DB_HOST: Joi.string().required(),
  SOURCE_DB_PORT: Joi.number().required(),
  SOURCE_DB_USERNAME: Joi.string().allow('').optional(),
  SOURCE_DB_PASSWORD: Joi.string().allow('').optional(),
  SOURCE_DB_DATABASE: Joi.string().allow('').optional(),

  // Redis (Bull queue)
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Auth
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),

  // Notifications
  NOTIFICATIONS_SERVICE_URL: Joi.string().uri().required(),

  // Easypaisa inquiry gateway — no fallback in code, so these are hard
  // requirements: an undefined value here used to fail silently at request
  // time instead of at startup.
  EASYPAISA_STORE_ID: Joi.string().required(),
  EASYPAISA_CREDENTIALS: Joi.string().required(),
  EASYPAISA_ACCOUNT_NUM: Joi.string().required(),
  EASYPAISA_INQUIRY_API_URL: Joi.string().uri().required(),

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
  JAZZCASH_SALT: Joi.string().required(),
  JAZZCASH_CURRENCY: Joi.string().required(),
  JAZZCASH_INQUIRY_API_URL: Joi.string().uri().required(),
  JAZZCASH_REFUND_API_URL: Joi.string().uri().allow('').optional(),
  JAZZCASH_CARD_REFUND_API_URL: Joi.string().uri().allow('').optional(),
  JAZZCASH_ORCHESTRATOR_URL: Joi.string().uri().required(),
}).unknown(true);
