import { registerAs } from '@nestjs/config';

export default registerAs('jazzcash', () => {
  const baseUrl = process.env.JAZZCASH_BASE_URL || 'https://onlinepayments.jazzcash.com.pk/payment-orchestrator';
  return {
    merchantId: process.env.JAZZCASH_MERCHANT_ID,
    password: process.env.JAZZCASH_PASSWORD,
    merchantMpin: process.env.JAZZCASH_MERCHANT_MPIN,
    salt: process.env.JAZZCASH_INTEGRITY_SALT || process.env.JAZZCASH_SALT,
    currency: process.env.JAZZCASH_CURRENCY || 'PKR',
    inquiryApiUrl: process.env.JAZZCASH_INQUIRY_API_URL || `${baseUrl}/api/v2/rest/payments/status/inquiry`,
    refundApiUrl: process.env.JAZZCASH_REFUND_API_URL || `${baseUrl}/api/v1/rest/payments/m-wallet/refund`,
    cardRefundApiUrl: process.env.JAZZCASH_CARD_REFUND_API_URL || `${baseUrl}/api/v1/rest/payments/mpgs/authorize/refund`,
    orchestratorUrl: process.env.JAZZCASH_ORCHESTRATOR_URL || `${baseUrl}/api/v1/rest/payments/mpgs/v2.0/authorize/refund`,
  };
});
