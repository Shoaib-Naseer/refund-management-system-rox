import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildMsisdnVariants, toSubscriberFormat, toPayerFormat } from './msisdn-utils';
import { InquiryService } from './inquiry-service';

export interface VerificationResult {
  era: number;
  paymentId: string;
  orderId?: string;
  amountDeducted: number;
  paymentStatus: string;
  packagePosted: string;
  refundEligibility: string;
  actualRefundAmount: number;
  sourceTable?: string;
  inquiryStatus?: string;
  inquiryRawResponse?: string;
  fulfillmentStatus?: string;
  isPartialRefund?: boolean;
  loanAmount?: number;
  userAmount?: number;
  failureReason?: string;
  timestamp?: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @Inject('SOURCE_DATA_SOURCE') private readonly sourceDataSource: DataSource, // For rox_app / fintech_records
    private readonly inquiryService: InquiryService,
  ) {}

  /**
   * Run verification check on a refund case
   */
  async verifyCase(input: {
    msisdn: string;
    amount: number | null;
    orderId?: string;
    transactionDatetime?: Date;
  }): Promise<{
    result: any;
    comment: string;
    checks: any;
    sourceTransactionId: number | null;
    sourceRecord: any | null;
  }> {
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

  /**
   * Verify a complaint against Fintech Era, Legacy Fulfillment, and Legacy Journey.
   * Mirrors the logic from scripts/refund-tools/complaint-verification/index.ts
   */
  async verifyComplaint(msisdn: string, amount: number | null, date: Date | null): Promise<VerificationResult[]> {
    this.logger.log(`Verifying complaint for MSISDN: ${msisdn}, Amount: ${amount}`);

    // Era 3 (Fintech Records, live since 2026-06-20 13:14:56) and Era 2
    // (Legacy Fulfillment, live since 2026-03-18 17:53:29) hold the most
    // recent and reliable entries, so both are checked unconditionally
    // for every case, not as a sequential fallback.
    const [era3Results, era2Results] = await Promise.all([
      this.verifyFintechEra(msisdn, amount),
      this.verifyLegacyFulfillmentEra(msisdn, amount),
    ]);

    let results = [...era3Results, ...era2Results];

    // 3. Fallback to Era 1 (Legacy Journey) only if neither mandatory era found anything
    if (results.length === 0) {
       this.logger.log(`No records found in Era 3 or Era 2. Checking Era 1 for ${msisdn}...`);
       results = await this.verifyLegacyJourneyEra(msisdn, amount);
    }

    if (results.length === 0) {
      this.logger.warn(`No payment record found across any era for MSISDN: ${msisdn}`);
    }

    return results;
  }

  /**
   * Verifies Fintech Era (Era 3) transactions.
   * Ported from: scripts/refund-tools/complaint-verification/fintech-era.ts
   */
  private async verifyFintechEra(msisdn: string, amount: number | null): Promise<VerificationResult[]> {
    const subscriberNum = toSubscriberFormat(msisdn);
    const payerNum = toPayerFormat(msisdn);
    const msisdnVariants = buildMsisdnVariants(msisdn);

    this.logger.log(`[Era 3] Starting verification for ${msisdn} (${subscriberNum}/${payerNum}), amount: ${amount}...`);

    let joinedRows: any[];
    try {
      joinedRows = await this.sourceDataSource.query(
        `
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
        `,
        [...msisdnVariants, ...msisdnVariants],
      );
    } catch (e) {
      this.logger.error(`Error querying Era 3: ${e.message}`);
      return [];
    }

    if (joinedRows.length === 0) {
      this.logger.log(`[Era 3] No transactions found matching MSISDN.`);
      return [];
    }

    this.logger.log(`[Era 3] Found ${joinedRows.length} candidate transactions.`);
    const results: VerificationResult[] = [];

    for (const payRow of joinedRows) {
      const paymentOrderId = payRow.payment_order_id;
      const paymentId = payRow.txn_reference || '';
      const txnRef = payRow.txn_reference || '';
      const dbAmount = Number(payRow.amount);
      const dbStatus = String(payRow.transaction_status || '').toUpperCase();
      const paymentKey = String(payRow.sub_payment_key || '').toUpperCase();
      const createdAt = payRow.created_at ? new Date(payRow.created_at).toISOString() : '';

      // Loan amount comes from the JOIN result — no extra query needed
      const loanAmount = Number(payRow.loan_charge_amount || 0);

      // Check if the amount matches (either the exact deducted amount or user amount after loan repayment).
      // When the complaint amount is unknown, skip this filter and rely on MSISDN match alone.
      const isAmountMatch =
        amount === null ||
        Math.abs(dbAmount - amount) < 0.01 ||
        Math.abs(dbAmount - (amount + loanAmount)) < 0.01;

      if (!isAmountMatch) {
        this.logger.log(
          `[Era 3] Skipping payment ${paymentId} due to amount mismatch (deducted: ${dbAmount}, expected: ${amount} or ${amount + loanAmount})`,
        );
        continue;
      }

      const { isPaid, inquiryStatus, inquiryRawResponse } = await this.resolvePaidStatus(
        dbStatus === 'COMPLETED',
        paymentKey,
        txnRef || paymentOrderId,
      );

      if (!isPaid) {
        this.logger.log(`[Era 3] Payment ${paymentId} (Order: ${paymentOrderId}) is failed/unpaid. Skipping.`);
        continue;
      }

      // Payment is verified PAID. Now check if package was posted.
      let fulfillments: any[] = [];
      try {
        fulfillments = await this.sourceDataSource.query(
          `
            SELECT fulfillment_status, error_message, error_code
            FROM \`fintech_subscription\`.\`subscription_fulfillment_requests\`
            WHERE payment_order_id = ?
            ORDER BY created_at DESC
          `,
          [paymentOrderId],
        );
      } catch (e) {
        this.logger.error(`[Era 3] Error querying fulfillment requests for ${paymentOrderId}: ${e.message}`);
      }

      let packagePosted: 'Yes' | 'No' = 'No';
      let fulfillStatusStr = 'MISSING';
      let failureReason = 'No fulfillment record found';

      if (fulfillments.length > 0) {
        fulfillStatusStr = String(fulfillments[0].fulfillment_status || '').toUpperCase();
        const hasSuccess = fulfillments.some(
          (f) => String(f.fulfillment_status).toUpperCase() === 'SUCCESS',
        );

        if (hasSuccess) {
          packagePosted = 'Yes';
          failureReason = 'Package successfully posted';
        } else {
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
        sourceTable:
          'fintech_subscription.subscriptions + Fintech_payments.transactions + fintech_subscription.subscription_fulfillment_requests',
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

  private async verifyLegacyFulfillmentEra(msisdn: string, amount: number | null): Promise<VerificationResult[]> {
    this.logger.log(`[Era 2] Starting verification for ${msisdn}, amount: ${amount}...`);
    // Example logic ported from legacy-fulfillment.ts
    const msisdnVariants = [msisdn, msisdn.replace(/^92/, '0')]; // simplified for example
    
    // Query rox_app.subscription_fulfillment_requests
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
      
      const results: VerificationResult[] = [];
      for (const row of records) {
        const price = Number(row.amountDeducted || row.fulfillmentPrice);
        const dbPayStatus = String(row.paymentStatus || "").toUpperCase();
        const dbFulfillStatus = String(row.fulfillmentStatus || "").toUpperCase();
        const paymentMethod = String(row.paymentMethod || "").toUpperCase();
        const gatewayRef = row.paymentGatewayRef || "";
        const txId = row.transactionId || "";
        
        // Simple amount match
        if (amount !== null && Math.abs(price - amount) >= 0.01) {
          continue;
        }
        
        const dbSaysPaid = dbPayStatus === "SUCCESS" || dbPayStatus === "PAID" || dbPayStatus === "VERIFIED";
        const { isPaid, inquiryStatus, inquiryRawResponse } = await this.resolvePaidStatus(
          dbSaysPaid,
          paymentMethod,
          gatewayRef || txId,
        );
        
        if (!isPaid) continue;
        
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
    } catch (e) {
      this.logger.error(`Error querying Era 2: ${e.message}`);
      return [];
    }
  }

  private async verifyLegacyJourneyEra(msisdn: string, amount: number | null): Promise<VerificationResult[]> {
    this.logger.log(`[Era 1] Starting verification for ${msisdn}, amount: ${amount}...`);
    // Example logic ported from legacy-journey.ts
    const msisdnVariants = [msisdn, msisdn.replace(/^92/, '0')]; // simplified
    const results: VerificationResult[] = [];
    
    // 1. Query rox_easypaisa.easypaisa_transactions
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
        if (amount !== null && Math.abs(txAmount - amount) >= 0.01) continue;
        
        const dbStatus = String(row.paymentStatus || "").toUpperCase();
        const dbSaysPaid = dbStatus === "SUCCESS" || dbStatus === "COMPLETED" || dbStatus === "VERIFIED";
        
        const { isPaid, inquiryStatus, inquiryRawResponse } = await this.resolvePaidStatus(
          dbSaysPaid,
          "EASYPAISA",
          row.orderId || String(row.id),
        );
        
        if (!isPaid) continue;
        
        // Normally we'd check rox_app.transactions for journey logs here
        // Assuming packagePosted = 'No' for eligible cases if no success logs found
        const packagePosted = "No"; // Simplified for this example
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
    } catch (e) {
      this.logger.error(`Error querying Era 1: ${e.message}`);
    }
    
    return results;
  }

  private async resolvePaidStatus(
    dbSaysPaid: boolean,
    paymentMethodKey: string,
    inquiryRef: string,
  ): Promise<{ isPaid: boolean; inquiryStatus: string; inquiryRawResponse: string }> {
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
    const isJazzCashOrCard =
      pmUpper === "JAZZCASH" ||
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
        const body = await this.inquiryService.inquireEasypaisa(inquiryRef);
        const responseCode = String(body.responseCode || "");
        const responseDesc = String(
          body.responseDesc || body.message || "",
        ).toUpperCase();
        const transactionStatus = String(
          body.transactionStatus || "",
        ).toUpperCase();
        const transactionAmount = body.transactionAmount
          ? Number(body.transactionAmount)
          : null;
        const reversalAmount = body.reversalAmount
          ? Number(body.reversalAmount)
          : null;

        const hasApiSuccess =
          responseCode === "0000" && responseDesc === "SUCCESS";
        const isPaidInquiry = transactionStatus === "PAID";
        const isFullyReversed =
          transactionAmount !== null &&
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
      } catch (error: any) {
        return {
          isPaid: false,
          inquiryStatus: "Inquiry Failed",
          inquiryRawResponse: JSON.stringify({ error: error.message, data: error.response?.data }),
        };
      }
    }

    if (isJazzCashOrCard) {
      try {
        const body = await this.inquiryService.inquireJazzCash(inquiryRef);
        const hasApiSuccess = String(body.pp_ResponseCode || "") === "000";
        const isPaidInquiry =
          body.pp_Status === "Completed" ||
          body.pp_PaymentResponseCode === "000" ||
          body.pp_PaymentResponseCode === "121";
        const isFullyReversed = /REFUND|REVERS/.test(
          String(body.pp_Status || "").toUpperCase(),
        );

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
      } catch (error: any) {
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
}
