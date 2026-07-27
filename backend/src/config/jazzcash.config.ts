import { registerAs } from '@nestjs/config';

export default registerAs('jazzcash', () => ({
  merchantId: process.env.JAZZCASH_MERCHANT_ID,
  password: process.env.JAZZCASH_PASSWORD,
  merchantMpin: process.env.JAZZCASH_MERCHANT_MPIN,
  salt: process.env.JAZZCASH_INTEGRITY_SALT || process.env.JAZZCASH_SALT,
  currency: process.env.JAZZCASH_CURRENCY,
  inquiryApiUrl: process.env.JAZZCASH_INQUIRY_API_URL,
  refundApiUrl: process.env.JAZZCASH_REFUND_API_URL,
  cardRefundApiUrl: process.env.JAZZCASH_CARD_REFUND_API_URL,
  orchestratorUrl: process.env.JAZZCASH_ORCHESTRATOR_URL,
}));
