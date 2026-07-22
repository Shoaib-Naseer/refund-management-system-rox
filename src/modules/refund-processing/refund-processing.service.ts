import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import * as crypto from "crypto";
import { inquireEasypaisa } from "../verification/inquiry-service";

export interface RefundApiResult {
  provider: "Jazz_Cash" | "Easy_Paisa" | "Card";
  processedAt: string;
  success: boolean;
  message: string;
  rawResponse?: string;
}

@Injectable()
export class RefundProcessingService {
  private readonly logger = new Logger(RefundProcessingService.name);

  // Default PKT timezone
  private readonly PKT_TIMEZONE = process.env.PKT_TIMEZONE || "Asia/Karachi";

  // Config accessors
  private get easypaisaConfig() {
    return {
      storeId: process.env.EASYPAISA_STORE_ID || "",
      credentials:
        process.env.EASYPAISA_CREDENTIALS ||
        process.env.EASYPAISA_PASSWORD ||
        "",
      authToken:
        process.env.EASYPAISA_AUTH_TOKEN ||
        process.env.EASYPAISA_TOKEN ||
        process.env.JAZZ_EASYPAISA_TOKEN_KEY ||
        "",
      apiUrl: process.env.EASYPAISA_REFUND_API_URL || "",
      privateKey:
        process.env.EASYPAISA_REFUND_PRIVATE_KEY ||
        process.env.EASYPAISA_PRIVATE_KEY ||
        "",
    };
  }

  private get jazzcashConfig() {
    return {
      merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
      password: process.env.JAZZCASH_PASSWORD || "",
      merchantMpin: process.env.JAZZCASH_MERCHANT_MPIN || "",
      salt: process.env.JAZZCASH_SALT || "",
      currency: process.env.JAZZCASH_CURRENCY || "PKR",
      apiUrl:
        process.env.JAZZCASH_REFUND_API_URL ||
        "https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v1/rest/payments/m-wallet/refund",
      cardRefundApiUrl:
        process.env.JAZZCASH_CARD_REFUND_API_URL ||
        "https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v1/rest/payments/mpgs/authorize/refund",
      orchestratorUrl:
        "https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v1/rest/payments/mpgs/v2.0/authorize/refund",
    };
  }

  /**
   * Process a refund for a verified eligible complaint
   */
  async processRefund(
    paymentMethod: string,
    params: {
      orderId: string;
      amount: number;
      msisdn: string;
      accountNumber?: string;
      orderDate?: Date;
    },
  ): Promise<{
    success: boolean;
    description: string;
    rawResponse: any;
  }> {
    const { orderId, amount } = params;
    this.logger.log(
      `Processing refund via ${paymentMethod} for Order ID: ${orderId}, Amount: ${amount}`,
    );

    try {
      let result;
      if (paymentMethod === "Jazz_Cash" || paymentMethod === "JAZZCASH") {
        result = await this.refundViaJazzCashWallet(orderId, amount);
      } else if (
        paymentMethod === "Card" ||
        paymentMethod === "CARD" ||
        paymentMethod === "MCB_CARD"
      ) {
        result = await this.refundViaJazzCashCard(orderId, amount);
      } else {
        // Fallback to EasyPaisa
        result = await this.refundViaEasypaisa(
          orderId,
          amount,
          params.orderDate,
        );
      }

      return {
        success: result.success,
        description: result.message,
        rawResponse: result.rawResponse ? JSON.parse(result.rawResponse) : null,
      };
    } catch (error: any) {
      this.logger.error(
        `Critical refund API execution error: ${error.message}`,
      );
      return {
        success: false,
        description: `Exception: ${error.message}`,
        rawResponse: { error: error.message },
      };
    }
  }

  private async refundViaJazzCashWallet(
    orderId: string,
    amount: number,
  ): Promise<{ success: boolean; message: string; rawResponse: string }> {
    this.logger.log(`Executing JazzCash Wallet Refund API for ${orderId}...`);

    if (!orderId || !amount || amount <= 0) {
      return {
        success: false,
        message: "Invalid orderId or amount",
        rawResponse: "{}",
      };
    }

    const config = this.jazzcashConfig;
    const amountInPaisa = String(Math.round(amount * 100));
    const secureHash = this.generateJazzCashSecureHash(
      orderId,
      amountInPaisa,
      config,
    );

    const payload = {
      pp_TxnRefNo: orderId,
      pp_Amount: amountInPaisa,
      pp_TxnCurrency: config.currency,
      pp_MerchantID: config.merchantId,
      pp_Password: config.password,
      pp_MerchantMPIN: config.merchantMpin,
      pp_SecureHash: secureHash,
    };

    try {
      const response = await this.executeWithRetry(
        `JazzCash Wallet Refund (${orderId})`,
        () => axios.post(config.apiUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        })
      );

      const responseBody = response.data ?? {};
      const message = String(responseBody.pp_ResponseMessage ?? "");

      // Fallback: If code 110 and message is 'Transaction does not exist for the specified criteria.'
      if (
        responseBody.pp_ResponseCode === "110" &&
        responseBody.pp_ResponseMessage &&
        responseBody.pp_ResponseMessage
          .toLowerCase()
          .includes("transaction does not exist")
      ) {
        this.logger.log(
          `JazzCash returned 110 for wallet, trying Orchestrator fallback...`,
        );
        return await this.callJazzCashOrchestratorRefundApi(payload, config);
      }

      const success =
        responseBody.pp_ResponseCode === "000" ||
        responseBody.pp_ResponseCode === "121" ||
        responseBody.pp_ResponseCode === "999";
      return { success, message, rawResponse: JSON.stringify(response.data) };
    } catch (error: any) {
      const message = error.message;
      const rawResponse = error.response?.data
        ? JSON.stringify(error.response.data)
        : JSON.stringify({ error: message });
      return { success: false, message, rawResponse };
    }
  }

  private async callJazzCashOrchestratorRefundApi(
    payload: any,
    config: any,
  ): Promise<{ success: boolean; message: string; rawResponse: string }> {
    try {
      const response = await this.executeWithRetry(
        `JazzCash Orchestrator Fallback (${payload.pp_TxnRefNo})`,
        () => axios.post(config.orchestratorUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        })
      );
      const responseBody = response.data ?? {};
      const message = String(responseBody.pp_ResponseMessage ?? "");

      const success =
        responseBody.pp_ResponseCode === "000" ||
        responseBody.pp_ResponseCode === "121" ||
        responseBody.pp_ResponseCode === "999" ||
        responseBody.status === "SUCCESS";
      return { success, message, rawResponse: JSON.stringify(response.data) };
    } catch (error: any) {
      const message = error.message;
      const rawResponse = error.response?.data
        ? JSON.stringify(error.response.data)
        : JSON.stringify({ error: message });
      return { success: false, message, rawResponse };
    }
  }

  private async refundViaJazzCashCard(
    orderId: string,
    amount: number,
  ): Promise<{ success: boolean; message: string; rawResponse: string }> {
    this.logger.log(`Executing JazzCash Card Refund API for ${orderId}...`);

    if (!orderId || !amount || amount <= 0) {
      return {
        success: false,
        message: "Invalid orderId or amount",
        rawResponse: "{}",
      };
    }

    const config = this.jazzcashConfig;
    const amountInPaisa = String(Math.round(amount * 100));

    // Hash input is the same as wallet
    const secureHash = this.generateJazzCashSecureHash(
      orderId,
      amountInPaisa,
      config,
    );

    const payload = {
      pp_TxnRefNo: orderId,
      pp_Amount: amountInPaisa,
      pp_TxnCurrency: config.currency,
      pp_MerchantID: config.merchantId,
      pp_Password: config.password,
      pp_MerchantMPIN: config.merchantMpin,
      pp_SecureHash: secureHash,
    };

    try {
      const response = await this.executeWithRetry(
        `JazzCash Card Refund (${orderId})`,
        () => axios.post(config.cardRefundApiUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        })
      );

      const responseBody = response.data ?? {};
      const message = String(
        responseBody.pp_ResponseMessage ??
        responseBody.ResponseMessage ??
        ""
      );

      const success =
        responseBody.pp_ResponseCode === "000" ||
        responseBody.ResponseCode === "000";
      return { success, message, rawResponse: JSON.stringify(response.data) };
    } catch (error: any) {
      const message = error.message;
      const rawResponse = error.response?.data
        ? JSON.stringify(error.response.data)
        : JSON.stringify({ error: message });
      return { success: false, message, rawResponse };
    }
  }

  private async refundViaEasypaisa(
    orderId: string,
    amount: number,
    transactionDate?: Date,
  ): Promise<{ success: boolean; message: string; rawResponse: string }> {
    const config = this.easypaisaConfig;

    if (!orderId || !amount || amount <= 0) {
      return {
        success: false,
        message: "Invalid orderId or amount",
        rawResponse: "{}",
      };
    }
    if (!config.credentials || !config.authToken || !config.privateKey) {
      return {
        success: false,
        message: "Missing Easypaisa credentials/keys",
        rawResponse: "{}",
      };
    }

    // EasyPaisa's refund API validates orderId + orderDate together and
    // rejects the pair with "Transaction does not exist" if the date is off
    // by even one calendar day — and our locally-stored transaction
    // timestamp (sourced from our own DB, not EasyPaisa's) can drift by a
    // few hours, which is enough to cross midnight. Prefer the date from a
    // live inquiry (EasyPaisa's own record) when available; only fall back
    // to our stored timestamp if the inquiry itself fails.
    const orderDate = await this.resolveEasypaisaOrderDate(orderId, transactionDate);

    const request = {
      externalSystemId: crypto.randomUUID(),
      storeId: config.storeId,
      reversalAmount: String(amount),
      orderId: String(orderId),
      orderDate,
      cnic: "",
    };

    try {
      const signature = this.generateEasypaisaSignature(
        request,
        config.privateKey,
      );

      const payload = { request, signature };

      const response = await this.executeWithRetry(
        `Easypaisa Refund (${orderId})`,
        () => axios.post(config.apiUrl, payload, {
          headers: {
            Credentials: config.credentials,
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.authToken}`,
          },
          timeout: 30000,
        })
      );

      const responseBody = response.data?.response ?? response.data ?? {};
      const message = String(
        responseBody.responseDesc ??
          responseBody.message ??
          responseBody.responseCode ??
          response.status,
      );
      // 320014 is a success case, 0004 is refund already done
      const success =
        responseBody.responseCode === "320014" ||
        responseBody.responseCode === "0004";
      return { success, message, rawResponse: JSON.stringify(responseBody) };
    } catch (error: any) {
      const message = error.message;
      const errorData = error.response?.data?.response ?? error.response?.data;
      const rawResponse = errorData
        ? JSON.stringify(errorData)
        : JSON.stringify({ error: message });
      return { success: false, message, rawResponse };
    }
  }

  private generateJazzCashSecureHash(
    txnRefNo: string,
    amount: string,
    config: any,
  ): string {
    const hashInput = `${config.salt}&${amount}&${config.merchantId}&${config.merchantMpin}&${config.password}&${config.currency}&${txnRefNo}`;
    return crypto
      .createHmac("sha256", config.salt)
      .update(hashInput)
      .digest("hex")
      .toUpperCase();
  }

  private generateEasypaisaSignature(
    requestData: Record<string, string>,
    rawPrivateKey: string,
  ): string {
    const privateKey = rawPrivateKey.replaceAll(String.raw`\n`, "\n").trim();
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(JSON.stringify(requestData));
    signer.end();
    return signer.sign(privateKey, "base64");
  }

  /**
   * Resolves the orderDate to send with an EasyPaisa refund request.
   * Prefers the date EasyPaisa itself reports for this orderId (via a live
   * inquiry, format "DD/MM/YYYY hh:mm A") over our locally-stored
   * transaction timestamp, since the two can drift.
   */
  private async resolveEasypaisaOrderDate(
    orderId: string,
    fallbackDate?: Date,
  ): Promise<string> {
    try {
      const inquiry = await inquireEasypaisa(orderId);
      const gatewayDate = String(inquiry.transactionDateTime || "").split(" ")[0];
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(gatewayDate)) {
        return gatewayDate;
      }
    } catch (error: any) {
      this.logger.warn(
        `[EasyPaisa] Could not resolve orderDate via live inquiry for ${orderId}, falling back to stored timestamp: ${error.message}`,
      );
    }
    return this.formatDateForRefund(fallbackDate || new Date());
  }

  private formatDateForRefund(value: Date): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: this.PKT_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(value);

    const partMap = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${partMap.day}/${partMap.month}/${partMap.year}`;
  }

  /**
   * Helper to execute a promise-returning function with exponential backoff retries.
   * Starts with 2 seconds initial delay and doubles it each retry up to 3 attempts total.
   */
  private async executeWithRetry<T>(
    operationName: string,
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 2000,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        if (attempt > maxRetries) {
          this.logger.error(
            `[Retry] ${operationName} failed after ${maxRetries} attempts. Error: ${error.message}`,
          );
          throw error;
        }

        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[Retry] ${operationName} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms... Error: ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
