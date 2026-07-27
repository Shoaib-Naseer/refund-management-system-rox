import { registerAs } from '@nestjs/config';

export default registerAs('easypaisa', () => ({
  inquiry: {
    storeId: process.env.EASYPAISA_STORE_ID,
    credentials: process.env.EASYPAISA_CREDENTIALS || process.env.EASYPAISA_PASSWORD,
    accountNum: process.env.EASYPAISA_ACCOUNT_NUM,
    apiUrl: process.env.EASYPAISA_INQUIRY_API_URL || process.env.EASYPAISA_INQUIRY_URL,
  },
  refund: {
    storeId: process.env.EASYPAISA_STORE_ID,
    credentials:
      process.env.EASYPAISA_CREDENTIALS || process.env.EASYPAISA_PASSWORD,
    authToken:
      process.env.EASYPAISA_AUTH_TOKEN ||
      process.env.EASYPAISA_TOKEN ||
      process.env.JAZZ_EASYPAISA_TOKEN_KEY,
    apiUrl: process.env.EASYPAISA_REFUND_API_URL,
    privateKey:
      process.env.EASYPAISA_REFUND_PRIVATE_KEY ||
      process.env.EASYPAISA_PRIVATE_KEY,
  },
}));
