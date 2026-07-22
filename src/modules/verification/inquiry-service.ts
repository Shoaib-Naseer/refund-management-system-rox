import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Direct gateway status inquiry helpers.
 * Ported from scripts/refund-tools/complaint-verification/inquiry-service.ts
 */

const EASYPAISA_INQUIRY_CONFIG = {
  storeId: process.env.EASYPAISA_STORE_ID || '485616',
  credentials:
    process.env.EASYPAISA_CREDENTIALS ||
    process.env.EASYPAISA_PASSWORD ||
    'Uk9YKFBNQ0wpOjJjOGY1MmVlNTY1ZjE1M2RhNDdmZGNjODE5MDk0NmIw',
  accountNum: process.env.EASYPAISA_ACCOUNT_NUM || '152497498',
  apiUrl:
    process.env.EASYPAISA_INQUIRY_API_URL ||
    'https://easypay.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction',
};

/**
 * Inquires transaction status directly from the Easypaisa gateway and returns the raw response body
 * @param orderId External payment gateway order reference ID
 */
export async function inquireEasypaisa(
  orderId: string,
): Promise<Record<string, any>> {
  if (!orderId) {
    throw new Error('Order ID is required for Easypaisa inquiry');
  }

  const payload = {
    orderId,
    storeId: EASYPAISA_INQUIRY_CONFIG.storeId,
    accountNum: EASYPAISA_INQUIRY_CONFIG.accountNum,
  };

  const response = await axios.post(EASYPAISA_INQUIRY_CONFIG.apiUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      Credentials: EASYPAISA_INQUIRY_CONFIG.credentials,
    },
    timeout: 30000,
  });

  return response.data || {};
}

const JAZZCASH_INQUIRY_CONFIG = {
  merchantId: process.env.JAZZCASH_MERCHANT_ID || 'ROXRESUB50',
  password: process.env.JAZZCASH_PASSWORD || 'vvuxf07v0z',
  salt:
    process.env.JAZZCASH_INTEGRITY_SALT ||
    process.env.JAZZCASH_SALT ||
    'e4989022y8',
  apiUrl:
    process.env.JAZZCASH_INQUIRY_API_URL ||
    'https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v2/rest/payments/status/inquiry',
};

/**
 * JazzCash's inquiry endpoint requires a SecureHash: HMAC-SHA256(salt, "salt&v1&v2&...")
 * where v1..vN are the values of every pp_* field (excluding pp_SecureHash itself),
 * sorted alphabetically by key.
 */
function generateJazzCashInquirySecureHash(
  payload: Record<string, string>,
): string {
  const sortedKeys = Object.keys(payload)
    .filter((k) => k.startsWith('pp_'))
    .sort();
  const hashString = sortedKeys.map((k) => payload[k]).join('&');
  const finalString = `${JAZZCASH_INQUIRY_CONFIG.salt}&${hashString}`;

  return crypto
    .createHmac('sha256', JAZZCASH_INQUIRY_CONFIG.salt)
    .update(finalString)
    .digest('hex')
    .toUpperCase();
}

/**
 * Inquires transaction status directly from the JazzCash gateway and returns the raw response body
 * @param txnRefNo JazzCash transaction reference number (pp_TxnRefNo)
 */
export async function inquireJazzCash(
  txnRefNo: string,
): Promise<Record<string, any>> {
  if (!txnRefNo) {
    throw new Error('Transaction reference number is required for JazzCash inquiry');
  }

  const payload: Record<string, string> = {
    pp_MerchantID: JAZZCASH_INQUIRY_CONFIG.merchantId,
    pp_Password: JAZZCASH_INQUIRY_CONFIG.password,
    pp_TxnRefNo: txnRefNo,
  };
  const secureHash = generateJazzCashInquirySecureHash(payload);
  const body = { ...payload, pp_SecureHash: secureHash };

  const response = await axios.post(JAZZCASH_INQUIRY_CONFIG.apiUrl, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  return response.data || {};
}
