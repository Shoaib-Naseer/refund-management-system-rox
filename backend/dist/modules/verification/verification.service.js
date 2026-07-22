"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const msisdn_utils_1 = require("./msisdn-utils");
const inquiry_service_1 = require("./inquiry-service");
let VerificationService = VerificationService_1 = class VerificationService {
    constructor(sourceDataSource) {
        this.sourceDataSource = sourceDataSource;
        this.logger = new common_1.Logger(VerificationService_1.name);
    }
    async verifyCase(input) {
        const { msisdn, amount, orderId, transactionDatetime } = input;
        const records = await this.verifyComplaint(msisdn, amount, transactionDatetime);
        if (records.length === 0) {
            return {
                result: 'not_found',
                comment: 'No payment record found across any era.',
                checks: { recordFound: false },
                sourceTransactionId: null,
                sourceRecord: null,
            };
        }
        let matchedRecord = records[0];
        if (orderId) {
            const match = records.find((r) => r.paymentId === orderId);
            if (match) {
                matchedRecord = match;
            }
        }
        const isEligible = matchedRecord.refundEligibility === 'Eligible';
        return {
            result: isEligible ? 'approved' : 'rejected',
            comment: isEligible
                ? `Approved: Found record in Era ${matchedRecord.era} with eligible status.`
                : `Rejected: Found record in Era ${matchedRecord.era} but service was fulfilled (package posted: ${matchedRecord.packagePosted}).`,
            checks: {
                recordFound: true,
                era: matchedRecord.era,
                paymentStatus: matchedRecord.paymentStatus,
                packagePosted: matchedRecord.packagePosted,
                refundEligibility: matchedRecord.refundEligibility,
                actualRefundAmount: matchedRecord.actualRefundAmount,
            },
            sourceTransactionId: isNaN(Number(matchedRecord.paymentId))
                ? null
                : Number(matchedRecord.paymentId),
            sourceRecord: matchedRecord,
        };
    }
    async verifyComplaint(msisdn, amount, date) {
        this.logger.log(`Verifying complaint for MSISDN: ${msisdn}, Amount: ${amount}`);
        const [era3Results, era2Results] = await Promise.all([
            this.verifyFintechEra(msisdn, amount),
            this.verifyLegacyFulfillmentEra(msisdn, amount),
        ]);
        let results = [...era3Results, ...era2Results];
        if (results.length === 0) {
            this.logger.log(`No records found in Era 3 or Era 2. Checking Era 1 for ${msisdn}...`);
            results = await this.verifyLegacyJourneyEra(msisdn, amount);
        }
        if (results.length === 0) {
            this.logger.warn(`No payment record found across any era for MSISDN: ${msisdn}`);
        }
        return results;
    }
    async verifyFintechEra(msisdn, amount) {
        const subscriberNum = (0, msisdn_utils_1.toSubscriberFormat)(msisdn);
        const payerNum = (0, msisdn_utils_1.toPayerFormat)(msisdn);
        const msisdnVariants = (0, msisdn_utils_1.buildMsisdnVariants)(msisdn);
        this.logger.log(`[Era 3] Starting verification for ${msisdn} (${subscriberNum}/${payerNum}), amount: ${amount}...`);
        let joinedRows;
        try {
            joinedRows = await this.sourceDataSource.query(`
          SELECT
            t.id,
            t.payment_order_id,
            t.txn_reference,
            t.amount,
            t.transaction_status,
            t.created_at,
            t.account_no,
            s.loan_charge_amount,
            s.mobile_number AS sub_mobile_number,
            s.wallet_number AS sub_wallet_number,
            s.payment_key AS sub_payment_key
          FROM \`fintech_subscription\`.\`subscriptions\` s
          INNER JOIN \`Fintech_payments\`.\`transactions\` t
            ON s.payment_order_id = t.payment_order_id
          WHERE s.mobile_number IN (${msisdnVariants.map(() => '?').join(', ')})
             OR s.wallet_number IN (${msisdnVariants.map(() => '?').join(', ')})
          ORDER BY t.created_at DESC
        `, [...msisdnVariants, ...msisdnVariants]);
        }
        catch (e) {
            this.logger.error(`Error querying Era 3: ${e.message}`);
            return [];
        }
        if (joinedRows.length === 0) {
            this.logger.log(`[Era 3] No transactions found matching MSISDN.`);
            return [];
        }
        this.logger.log(`[Era 3] Found ${joinedRows.length} candidate transactions.`);
        const results = [];
        for (const payRow of joinedRows) {
            const paymentOrderId = payRow.payment_order_id;
            const paymentId = payRow.txn_reference || '';
            const txnRef = payRow.txn_reference || '';
            const dbAmount = Number(payRow.amount);
            const dbStatus = String(payRow.transaction_status || '').toUpperCase();
            const paymentKey = String(payRow.sub_payment_key || '').toUpperCase();
            const createdAt = payRow.created_at ? new Date(payRow.created_at).toISOString() : '';
            const loanAmount = Number(payRow.loan_charge_amount || 0);
            const isAmountMatch = amount === null ||
                Math.abs(dbAmount - amount) < 0.01 ||
                Math.abs(dbAmount - (amount + loanAmount)) < 0.01;
            if (!isAmountMatch) {
                this.logger.log(`[Era 3] Skipping payment ${paymentId} due to amount mismatch (deducted: ${dbAmount}, expected: ${amount} or ${amount + loanAmount})`);
                continue;
            }
            const { isPaid, inquiryStatus, inquiryRawResponse } = await this.resolvePaidStatus(dbStatus === 'COMPLETED', paymentKey, txnRef || paymentOrderId);
            if (!isPaid) {
                this.logger.log(`[Era 3] Payment ${paymentId} (Order: ${paymentOrderId}) is failed/unpaid. Skipping.`);
                continue;
            }
            let fulfillments = [];
            try {
                fulfillments = await this.sourceDataSource.query(`
            SELECT fulfillment_status, error_message, error_code
            FROM \`fintech_subscription\`.\`subscription_fulfillment_requests\`
            WHERE payment_order_id = ?
            ORDER BY created_at DESC
          `, [paymentOrderId]);
            }
            catch (e) {
                this.logger.error(`[Era 3] Error querying fulfillment requests for ${paymentOrderId}: ${e.message}`);
            }
            let packagePosted = 'No';
            let fulfillStatusStr = 'MISSING';
            let failureReason = 'No fulfillment record found';
            if (fulfillments.length > 0) {
                fulfillStatusStr = String(fulfillments[0].fulfillment_status || '').toUpperCase();
                const hasSuccess = fulfillments.some((f) => String(f.fulfillment_status).toUpperCase() === 'SUCCESS');
                if (hasSuccess) {
                    packagePosted = 'Yes';
                    failureReason = 'Package successfully posted';
                }
                else {
                    packagePosted = 'No';
                    failureReason = fulfillments[0].error_message || fulfillments[0].error_code || 'Fulfillment failed';
                }
            }
            const isPartialRefund = loanAmount > 0;
            const userAmount = Math.max(dbAmount - loanAmount, 0);
            const isReversed = inquiryStatus === 'API Confirmed Paid (Reversed)';
            const actualRefundAmount = packagePosted === 'No' ? (isReversed ? 0 : userAmount) : 0;
            const refundEligibility = (packagePosted === 'No' && !isReversed) ? 'Eligible' : 'Ineligible';
            let finalFailureReason = failureReason;
            if (isReversed) {
                finalFailureReason = 'Transaction was fully reversed by gateway. ' + failureReason;
            }
            results.push({
                era: 3,
                paymentId,
                orderId: paymentOrderId,
                amountDeducted: dbAmount,
                paymentStatus: dbStatus,
                sourceTable: 'fintech_subscription.subscriptions + Fintech_payments.transactions + fintech_subscription.subscription_fulfillment_requests',
                inquiryStatus,
                inquiryRawResponse: inquiryRawResponse || undefined,
                packagePosted,
                fulfillmentStatus: fulfillStatusStr,
                refundEligibility,
                isPartialRefund,
                loanAmount,
                userAmount,
                actualRefundAmount,
                failureReason: finalFailureReason,
                timestamp: createdAt,
            });
        }
        return results;
    }
    async verifyLegacyFulfillmentEra(msisdn, amount) {
        this.logger.log(`[Era 2] Starting verification for ${msisdn}, amount: ${amount}...`);
        const msisdnVariants = [msisdn, msisdn.replace(/^92/, '0')];
        let query = `
      SELECT transaction_id as "transactionId", mobile_number as "mobileNumber", 
             fulfillment_price as "fulfillmentPrice", payment_status as "paymentStatus", 
             payment_gateway_ref as "paymentGatewayRef", amount_deducted as "amountDeducted", 
             fulfillment_status as "fulfillmentStatus", payment_method as "paymentMethod", metadata, created_at as "createdAt"
      FROM rox_app.subscription_fulfillment_requests
      WHERE mobile_number IN (?, ?)
      ORDER BY created_at DESC
    `;
        try {
            const records = await this.sourceDataSource.query(query, msisdnVariants);
            if (records.length === 0) {
                return [];
            }
            const results = [];
            for (const row of records) {
                const price = Number(row.amountDeducted || row.fulfillmentPrice);
                const dbPayStatus = String(row.paymentStatus || "").toUpperCase();
                const dbFulfillStatus = String(row.fulfillmentStatus || "").toUpperCase();
                const paymentMethod = String(row.paymentMethod || "").toUpperCase();
                const gatewayRef = row.paymentGatewayRef || "";
                const txId = row.transactionId || "";
                if (amount !== null && Math.abs(price - amount) >= 0.01) {
                    continue;
                }
                const dbSaysPaid = dbPayStatus === "SUCCESS" || dbPayStatus === "PAID" || dbPayStatus === "VERIFIED";
                const { isPaid, inquiryStatus, inquiryRawResponse } = await this.resolvePaidStatus(dbSaysPaid, paymentMethod, gatewayRef || txId);
                if (!isPaid)
                    continue;
                const packagePosted = (dbFulfillStatus === "SUCCESS" || dbFulfillStatus === "RECHARGE_POSTED") ? "Yes" : "No";
                const isReversed = inquiryStatus === "API Confirmed Paid (Reversed)";
                const refundEligibility = (packagePosted === "No" && !isReversed) ? "Eligible" : "Ineligible";
                const actualRefundAmount = packagePosted === "No" ? (isReversed ? 0 : price) : 0;
                results.push({
                    era: 2,
                    paymentId: row.paymentGatewayRef || row.transactionId,
                    amountDeducted: price,
                    paymentStatus: dbPayStatus,
                    packagePosted,
                    refundEligibility,
                    actualRefundAmount,
                    inquiryStatus,
                    inquiryRawResponse: inquiryRawResponse || undefined,
                });
            }
            return results;
        }
        catch (e) {
            this.logger.error(`Error querying Era 2: ${e.message}`);
            return [];
        }
    }
    async verifyLegacyJourneyEra(msisdn, amount) {
        this.logger.log(`[Era 1] Starting verification for ${msisdn}, amount: ${amount}...`);
        const msisdnVariants = [msisdn, msisdn.replace(/^92/, '0')];
        const results = [];
        const epQuery = `
      SELECT id, orderId, transactionAmount, paymentStatus, createdAt
      FROM rox_easypaisa.easypaisa_transactions
      WHERE mobileAccountNo IN (?, ?) OR msisdn IN (?, ?)
      ORDER BY createdAt DESC
    `;
        try {
            const epRecords = await this.sourceDataSource.query(epQuery, [...msisdnVariants, ...msisdnVariants]);
            for (const row of epRecords) {
                const txAmount = Number(row.transactionAmount);
                if (amount !== null && Math.abs(txAmount - amount) >= 0.01)
                    continue;
                const dbStatus = String(row.paymentStatus || "").toUpperCase();
                const dbSaysPaid = dbStatus === "SUCCESS" || dbStatus === "COMPLETED" || dbStatus === "VERIFIED";
                const { isPaid, inquiryStatus, inquiryRawResponse } = await this.resolvePaidStatus(dbSaysPaid, "EASYPAISA", row.orderId || String(row.id));
                if (!isPaid)
                    continue;
                const packagePosted = "No";
                const isReversed = inquiryStatus === "API Confirmed Paid (Reversed)";
                const refundEligibility = !isReversed ? "Eligible" : "Ineligible";
                const actualRefundAmount = !isReversed ? txAmount : 0;
                results.push({
                    era: 1,
                    paymentId: row.orderId || String(row.id),
                    amountDeducted: txAmount,
                    paymentStatus: dbStatus,
                    packagePosted,
                    refundEligibility,
                    actualRefundAmount,
                    inquiryStatus,
                    inquiryRawResponse: inquiryRawResponse || undefined,
                });
            }
        }
        catch (e) {
            this.logger.error(`Error querying Era 1: ${e.message}`);
        }
        return results;
    }
    async resolvePaidStatus(dbSaysPaid, paymentMethodKey, inquiryRef) {
        if (dbSaysPaid) {
            return {
                isPaid: true,
                inquiryStatus: "Not Triggered",
                inquiryRawResponse: "",
            };
        }
        const pmUpper = (paymentMethodKey || "")
            .toUpperCase()
            .trim()
            .replace(/[^A-Z0-9]/g, "");
        const isEasyPaisa = pmUpper === "EASYPAISA";
        const isJazzCashOrCard = pmUpper === "JAZZCASH" ||
            pmUpper === "CARD" ||
            pmUpper === "MCBCARD" ||
            pmUpper === "MCB" ||
            pmUpper === "JAZZCASHCARD";
        if (!isEasyPaisa && !isJazzCashOrCard) {
            return {
                isPaid: false,
                inquiryStatus: "Not Triggered",
                inquiryRawResponse: "",
            };
        }
        if (!inquiryRef || !inquiryRef.trim()) {
            return {
                isPaid: false,
                inquiryStatus: "Not Triggered (Missing Reference)",
                inquiryRawResponse: "",
            };
        }
        if (isEasyPaisa) {
            try {
                const body = await (0, inquiry_service_1.inquireEasypaisa)(inquiryRef);
                const responseCode = String(body.responseCode || "");
                const responseDesc = String(body.responseDesc || body.message || "").toUpperCase();
                const transactionStatus = String(body.transactionStatus || "").toUpperCase();
                const transactionAmount = body.transactionAmount
                    ? Number(body.transactionAmount)
                    : null;
                const reversalAmount = body.reversalAmount
                    ? Number(body.reversalAmount)
                    : null;
                const hasApiSuccess = responseCode === "0000" && responseDesc === "SUCCESS";
                const isPaidInquiry = transactionStatus === "PAID";
                const isFullyReversed = transactionAmount !== null &&
                    reversalAmount !== null &&
                    Math.abs(transactionAmount - reversalAmount) < 0.01;
                const isPaid = hasApiSuccess && isPaidInquiry;
                return {
                    isPaid,
                    inquiryStatus: isPaid
                        ? isFullyReversed
                            ? "API Confirmed Paid (Reversed)"
                            : "API Confirmed Paid"
                        : "API Confirmed Failed",
                    inquiryRawResponse: JSON.stringify(body),
                };
            }
            catch (error) {
                return {
                    isPaid: false,
                    inquiryStatus: "Inquiry Failed",
                    inquiryRawResponse: JSON.stringify({ error: error.message, data: error.response?.data }),
                };
            }
        }
        if (isJazzCashOrCard) {
            try {
                const body = await (0, inquiry_service_1.inquireJazzCash)(inquiryRef);
                const hasApiSuccess = String(body.pp_ResponseCode || "") === "000";
                const isPaidInquiry = body.pp_Status === "Completed" ||
                    body.pp_PaymentResponseCode === "000" ||
                    body.pp_PaymentResponseCode === "121";
                const isFullyReversed = /REFUND|REVERS/.test(String(body.pp_Status || "").toUpperCase());
                const isPaid = hasApiSuccess && isPaidInquiry;
                return {
                    isPaid,
                    inquiryStatus: isPaid
                        ? isFullyReversed
                            ? "API Confirmed Paid (Reversed)"
                            : "API Confirmed Paid"
                        : "API Confirmed Failed",
                    inquiryRawResponse: JSON.stringify(body),
                };
            }
            catch (error) {
                return {
                    isPaid: false,
                    inquiryStatus: "Inquiry Failed",
                    inquiryRawResponse: JSON.stringify({ error: error.message, data: error.response?.data }),
                };
            }
        }
        return {
            isPaid: false,
            inquiryStatus: "Not Triggered",
            inquiryRawResponse: "",
        };
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = VerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SOURCE_DATA_SOURCE')),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], VerificationService);
//# sourceMappingURL=verification.service.js.map