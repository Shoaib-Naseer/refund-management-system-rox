"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RefundProcessingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundProcessingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const crypto = require("crypto");
const inquiry_service_1 = require("../verification/inquiry-service");
let RefundProcessingService = RefundProcessingService_1 = class RefundProcessingService {
    constructor() {
        this.logger = new common_1.Logger(RefundProcessingService_1.name);
        this.PKT_TIMEZONE = process.env.PKT_TIMEZONE || "Asia/Karachi";
    }
    get easypaisaConfig() {
        return {
            storeId: process.env.EASYPAISA_STORE_ID || "",
            credentials: process.env.EASYPAISA_CREDENTIALS ||
                process.env.EASYPAISA_PASSWORD ||
                "",
            authToken: process.env.EASYPAISA_AUTH_TOKEN ||
                process.env.EASYPAISA_TOKEN ||
                process.env.JAZZ_EASYPAISA_TOKEN_KEY ||
                "",
            apiUrl: process.env.EASYPAISA_REFUND_API_URL || "",
            privateKey: process.env.EASYPAISA_REFUND_PRIVATE_KEY ||
                process.env.EASYPAISA_PRIVATE_KEY ||
                "",
        };
    }
    get jazzcashConfig() {
        return {
            merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
            password: process.env.JAZZCASH_PASSWORD || "",
            merchantMpin: process.env.JAZZCASH_MERCHANT_MPIN || "",
            salt: process.env.JAZZCASH_SALT || "",
            currency: process.env.JAZZCASH_CURRENCY || "PKR",
            apiUrl: process.env.JAZZCASH_REFUND_API_URL ||
                "https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v1/rest/payments/m-wallet/refund",
            cardRefundApiUrl: process.env.JAZZCASH_CARD_REFUND_API_URL ||
                "https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v1/rest/payments/mpgs/authorize/refund",
            orchestratorUrl: "https://onlinepayments.jazzcash.com.pk/payment-orchestrator/api/v1/rest/payments/mpgs/v2.0/authorize/refund",
        };
    }
    async processRefund(paymentMethod, params) {
        const { orderId, amount } = params;
        this.logger.log(`Processing refund via ${paymentMethod} for Order ID: ${orderId}, Amount: ${amount}`);
        try {
            let result;
            if (paymentMethod === "Jazz_Cash" || paymentMethod === "JAZZCASH") {
                result = await this.refundViaJazzCashWallet(orderId, amount);
            }
            else if (paymentMethod === "Card" ||
                paymentMethod === "CARD" ||
                paymentMethod === "MCB_CARD") {
                result = await this.refundViaJazzCashCard(orderId, amount);
            }
            else {
                result = await this.refundViaEasypaisa(orderId, amount, params.orderDate);
            }
            return {
                success: result.success,
                description: result.message,
                rawResponse: result.rawResponse ? JSON.parse(result.rawResponse) : null,
            };
        }
        catch (error) {
            this.logger.error(`Critical refund API execution error: ${error.message}`);
            return {
                success: false,
                description: `Exception: ${error.message}`,
                rawResponse: { error: error.message },
            };
        }
    }
    async refundViaJazzCashWallet(orderId, amount) {
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
        const secureHash = this.generateJazzCashSecureHash(orderId, amountInPaisa, config);
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
            const response = await this.executeWithRetry(`JazzCash Wallet Refund (${orderId})`, () => axios_1.default.post(config.apiUrl, payload, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
            }));
            const responseBody = response.data ?? {};
            const message = String(responseBody.pp_ResponseMessage ?? "");
            if (responseBody.pp_ResponseCode === "110" &&
                responseBody.pp_ResponseMessage &&
                responseBody.pp_ResponseMessage
                    .toLowerCase()
                    .includes("transaction does not exist")) {
                this.logger.log(`JazzCash returned 110 for wallet, trying Orchestrator fallback...`);
                return await this.callJazzCashOrchestratorRefundApi(payload, config);
            }
            const success = responseBody.pp_ResponseCode === "000" ||
                responseBody.pp_ResponseCode === "121" ||
                responseBody.pp_ResponseCode === "999";
            return { success, message, rawResponse: JSON.stringify(response.data) };
        }
        catch (error) {
            const message = error.message;
            const rawResponse = error.response?.data
                ? JSON.stringify(error.response.data)
                : JSON.stringify({ error: message });
            return { success: false, message, rawResponse };
        }
    }
    async callJazzCashOrchestratorRefundApi(payload, config) {
        try {
            const response = await this.executeWithRetry(`JazzCash Orchestrator Fallback (${payload.pp_TxnRefNo})`, () => axios_1.default.post(config.orchestratorUrl, payload, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
            }));
            const responseBody = response.data ?? {};
            const message = String(responseBody.pp_ResponseMessage ?? "");
            const success = responseBody.pp_ResponseCode === "000" ||
                responseBody.pp_ResponseCode === "121" ||
                responseBody.pp_ResponseCode === "999" ||
                responseBody.status === "SUCCESS";
            return { success, message, rawResponse: JSON.stringify(response.data) };
        }
        catch (error) {
            const message = error.message;
            const rawResponse = error.response?.data
                ? JSON.stringify(error.response.data)
                : JSON.stringify({ error: message });
            return { success: false, message, rawResponse };
        }
    }
    async refundViaJazzCashCard(orderId, amount) {
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
        const secureHash = this.generateJazzCashSecureHash(orderId, amountInPaisa, config);
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
            const response = await this.executeWithRetry(`JazzCash Card Refund (${orderId})`, () => axios_1.default.post(config.cardRefundApiUrl, payload, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
            }));
            const responseBody = response.data ?? {};
            const message = String(responseBody.pp_ResponseMessage ??
                responseBody.ResponseMessage ??
                "");
            const success = responseBody.pp_ResponseCode === "000" ||
                responseBody.ResponseCode === "000";
            return { success, message, rawResponse: JSON.stringify(response.data) };
        }
        catch (error) {
            const message = error.message;
            const rawResponse = error.response?.data
                ? JSON.stringify(error.response.data)
                : JSON.stringify({ error: message });
            return { success: false, message, rawResponse };
        }
    }
    async refundViaEasypaisa(orderId, amount, transactionDate) {
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
            const signature = this.generateEasypaisaSignature(request, config.privateKey);
            const payload = { request, signature };
            const response = await this.executeWithRetry(`Easypaisa Refund (${orderId})`, () => axios_1.default.post(config.apiUrl, payload, {
                headers: {
                    Credentials: config.credentials,
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.authToken}`,
                },
                timeout: 30000,
            }));
            const responseBody = response.data?.response ?? response.data ?? {};
            const message = String(responseBody.responseDesc ??
                responseBody.message ??
                responseBody.responseCode ??
                response.status);
            const success = responseBody.responseCode === "320014" ||
                responseBody.responseCode === "0004";
            return { success, message, rawResponse: JSON.stringify(responseBody) };
        }
        catch (error) {
            const message = error.message;
            const errorData = error.response?.data?.response ?? error.response?.data;
            const rawResponse = errorData
                ? JSON.stringify(errorData)
                : JSON.stringify({ error: message });
            return { success: false, message, rawResponse };
        }
    }
    generateJazzCashSecureHash(txnRefNo, amount, config) {
        const hashInput = `${config.salt}&${amount}&${config.merchantId}&${config.merchantMpin}&${config.password}&${config.currency}&${txnRefNo}`;
        return crypto
            .createHmac("sha256", config.salt)
            .update(hashInput)
            .digest("hex")
            .toUpperCase();
    }
    generateEasypaisaSignature(requestData, rawPrivateKey) {
        const privateKey = rawPrivateKey.replaceAll(String.raw `\n`, "\n").trim();
        const signer = crypto.createSign("RSA-SHA256");
        signer.update(JSON.stringify(requestData));
        signer.end();
        return signer.sign(privateKey, "base64");
    }
    async resolveEasypaisaOrderDate(orderId, fallbackDate) {
        try {
            const inquiry = await (0, inquiry_service_1.inquireEasypaisa)(orderId);
            const gatewayDate = String(inquiry.transactionDateTime || "").split(" ")[0];
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(gatewayDate)) {
                return gatewayDate;
            }
        }
        catch (error) {
            this.logger.warn(`[EasyPaisa] Could not resolve orderDate via live inquiry for ${orderId}, falling back to stored timestamp: ${error.message}`);
        }
        return this.formatDateForRefund(fallbackDate || new Date());
    }
    formatDateForRefund(value) {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: this.PKT_TIMEZONE,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).formatToParts(value);
        const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
        return `${partMap.day}/${partMap.month}/${partMap.year}`;
    }
    async executeWithRetry(operationName, fn, maxRetries = 3, initialDelayMs = 2000) {
        let attempt = 0;
        while (true) {
            try {
                return await fn();
            }
            catch (error) {
                attempt++;
                if (attempt > maxRetries) {
                    this.logger.error(`[Retry] ${operationName} failed after ${maxRetries} attempts. Error: ${error.message}`);
                    throw error;
                }
                const delay = initialDelayMs * Math.pow(2, attempt - 1);
                this.logger.warn(`[Retry] ${operationName} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms... Error: ${error.message}`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
};
exports.RefundProcessingService = RefundProcessingService;
exports.RefundProcessingService = RefundProcessingService = RefundProcessingService_1 = __decorate([
    (0, common_1.Injectable)()
], RefundProcessingService);
//# sourceMappingURL=refund-processing.service.js.map