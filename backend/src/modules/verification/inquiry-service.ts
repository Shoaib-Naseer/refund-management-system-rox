import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Direct gateway status inquiry helpers.
 * Ported from scripts/refund-tools/complaint-verification/inquiry-service.ts
 *
 * Config is read via ConfigService (not process.env directly, and not a
 * module-level const) so values are resolved lazily, after ConfigModule has
 * loaded + validated .env — see config/env.validation.ts.
 */
@Injectable()
export class InquiryService {
  constructor(private readonly configService: ConfigService) {}

  private getEasypaisaConfig() {
    return this.configService.getOrThrow('easypaisa.inquiry');
  }

  /**
   * Inquires transaction status directly from the Easypaisa gateway and returns the raw response body
   * @param orderId External payment gateway order reference ID
   */
  async inquireEasypaisa(orderId: string): Promise<Record<string, any>> {
    if (!orderId) {
      throw new Error('Order ID is required for Easypaisa inquiry');
    }

    const config = this.getEasypaisaConfig();

    const payload = {
      orderId,
      storeId: config.storeId,
      accountNum: config.accountNum,
    };

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        Credentials: config.credentials,
      },
      timeout: 30000,
    });

    return response.data || {};
  }

  private getJazzCashConfig() {
    const jazzcash = this.configService.getOrThrow('jazzcash');
    return {
      merchantId: jazzcash.merchantId,
      password: jazzcash.password,
      salt: jazzcash.salt,
      apiUrl: jazzcash.inquiryApiUrl,
    };
  }

  /**
   * JazzCash's inquiry endpoint requires a SecureHash: HMAC-SHA256(salt, "salt&v1&v2&...")
   * where v1..vN are the values of every pp_* field (excluding pp_SecureHash itself),
   * sorted alphabetically by key.
   */
  private generateJazzCashInquirySecureHash(
    payload: Record<string, string>,
    salt: string,
  ): string {
    const sortedKeys = Object.keys(payload)
      .filter((k) => k.startsWith('pp_'))
      .sort();
    const hashString = sortedKeys.map((k) => payload[k]).join('&');
    const finalString = `${salt}&${hashString}`;

    return crypto
      .createHmac('sha256', salt)
      .update(finalString)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Inquires transaction status directly from the JazzCash gateway and returns the raw response body
   * @param txnRefNo JazzCash transaction reference number (pp_TxnRefNo)
   */
  async inquireJazzCash(txnRefNo: string): Promise<Record<string, any>> {
    if (!txnRefNo) {
      throw new Error('Transaction reference number is required for JazzCash inquiry');
    }

    const config = this.getJazzCashConfig();

    const payload: Record<string, string> = {
      pp_MerchantID: config.merchantId,
      pp_Password: config.password,
      pp_TxnRefNo: txnRefNo,
    };
    const secureHash = this.generateJazzCashInquirySecureHash(payload, config.salt);
    const body = { ...payload, pp_SecureHash: secureHash };

    const response = await axios.post(config.apiUrl, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    return response.data || {};
  }
}
