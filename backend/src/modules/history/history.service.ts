import { Injectable, Logger, Inject } from "@nestjs/common";
import { DataSource, In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { RefundRequest, RefundRequestStatus } from "../../entities/refund-request.entity";
import { RefundCase, RefundCaseStatus, RefundStatus, VerificationResult } from "../../entities/refund-case.entity";
import { buildMsisdnVariants, toSubscriberFormat } from "../verification/msisdn-utils";
import { InquiryService } from "../verification/inquiry-service";

// Era 2/3 data isn't reliable before this point — Era 1 (Legacy Journey) is
// only auto-included when a caller-supplied date filter predates this cutoff.
const ERA1_CUTOFF = new Date("2026-03-18T18:11:31+05:00");

const DATE_WINDOW_DAYS = 5;

export interface InquiryInfo {
  triggered: boolean;
  provider: "EasyPaisa" | "JazzCash" | null;
  status: string;
  responseCode?: string;
  responseDesc?: string;
  raw?: any;
}

export interface HistoryRecord {
  era: 3 | 2 | 1;
  tableName: string;
  /** Transaction reference the actual refund would be posted against. */
  transactionReference: string;
  orderId: string;
  /** Same as orderId, exposed explicitly for Era 3 (fintech_subscription.subscriptions.payment_order_id). */
  paymentOrderId?: string;
  /** Era 2 only — rox_app.subscription_fulfillment_requests.transaction_id, distinct from the gateway's own orderId/txnRefNo. */
  tid?: string;
  paymentMethod?: string;
  packageName: string | null;
  amountDeducted: number;
  paymentStatus: string;
  packagePosted: "Yes" | "No" | "Not Applicable";
  fulfillmentStatus: string;
  errorMessage?: string | null;
  fulfillmentMessage?: string | null;
  refundEligibility: "Eligible" | "Ineligible" | "Not Applicable";
  actualRefundAmount: number;
  isPartialRefund: boolean;
  loanAmount: number;
  userAmount: number;
  timestamp: string;
  mobileNumber?: string;
  walletNumber?: string;
  inquiry: InquiryInfo;
  refundRequestStatus?: string;
  refundRequestId?: number;
  refundPostedBy?: string | null;
  refundReviewedBy?: string | null;
  refundApprovedBy?: string | null;
  refundApiResponse?: string | null;
  requestReason?: string | null;
  overrideJustification?: string | null;
  reviewComment?: string | null;
  paymentMode?: string;
  balanceChargeAmount?: number | null;
  externalChargeAmount?: number | null;
}

export interface HistoryFilters {
  amount: number | null;
  date: Date | null;
  packageName: string | null;
  includeEra1?: boolean;
  era?: string | null;
}

// Confirmed success signatures from live rox_app.transactions data — same
// list used by scripts/refund-tools/complaint-verification/legacy-journey.ts
const ERA1_SUCCESS_SIGNATURES: {
  stage: string;
  status: string;
  message: string;
}[] = [
    { stage: "Rox-Subscription", status: "COMPLETED", message: "Success" },
    {
      stage: "Rox-Subscription",
      status: "COMPLETED",
      message: "ROX package subscribed successfully!",
    },
    {
      stage: "Rox-Subscription",
      status: "FAILED",
      message: "Airtime recharged successfully!",
    },
    {
      stage: "process-bundle-sharing",
      status: "COMPLETED",
      message: "Bundle sharing process completed successfully",
    },
    {
      stage: "wso2-refill",
      status: "COMPLETED",
      message: "processDirectAirTimeRecharge completed successfully",
    },
    {
      stage: "wso2-refill",
      status: "COMPLETED",
      message: "Airtime recharged successfully!",
    },
    {
      stage: "IDD-Recharge",
      status: "COMPLETED",
      message: "Airtime recharged successfully!",
    },
    {
      stage: "IR-Recharge",
      status: "COMPLETED",
      message: "Airtime recharged successfully!",
    },
  ];

function isSuccessLog(stage: string, status: string, message: string): boolean {
  const s = (stage || "").trim();
  const st = (status || "").trim().toUpperCase();
  const m = (message || "").trim();
  return ERA1_SUCCESS_SIGNATURES.some(
    (sig) =>
      sig.stage === s && sig.status.toUpperCase() === st && sig.message === m,
  );
}

/** Ported from legacy-fulfillment.ts */
function calculateActualRefundAmount(
  amountDeducted: string | number,
  metadataStr: string | null | Record<string, any>,
): {
  actualRefundAmount: number;
  isPartialRefund: boolean;
  loanRepaymentAmount: number;
  userAmount: number;
} {
  const deductedAmount =
    typeof amountDeducted === "number"
      ? amountDeducted
      : Number.parseFloat(amountDeducted || "0");
  const safeDeductedAmount =
    Number.isFinite(deductedAmount) && deductedAmount > 0 ? deductedAmount : 0;

  if (!metadataStr) {
    return {
      actualRefundAmount: safeDeductedAmount,
      isPartialRefund: false,
      loanRepaymentAmount: 0,
      userAmount: safeDeductedAmount,
    };
  }

  try {
    const parsed =
      typeof metadataStr === "string" ? JSON.parse(metadataStr) : metadataStr;
    const loanAmount = Number(parsed.loanAmount ?? 0);
    // metadata doesn't always carry an isLoanRepayment flag — a present, positive
    // loanAmount key is itself sufficient signal that part of the deduction was a loan.
    const hasPartialRefund = Number.isFinite(loanAmount) && loanAmount > 0;

    if (!hasPartialRefund) {
      return {
        actualRefundAmount: safeDeductedAmount,
        isPartialRefund: false,
        loanRepaymentAmount: 0,
        userAmount: safeDeductedAmount,
      };
    }

    const normalizedLoanAmount = Math.min(loanAmount, safeDeductedAmount);
    const metadataUserAmount = Number(parsed.userAmount ?? NaN);
    const normalizedUserAmount = Number.isFinite(metadataUserAmount)
      ? metadataUserAmount
      : Math.max(safeDeductedAmount - normalizedLoanAmount, 0);

    return {
      actualRefundAmount: Math.max(
        safeDeductedAmount - normalizedLoanAmount,
        0,
      ),
      isPartialRefund: true,
      loanRepaymentAmount: normalizedLoanAmount,
      userAmount: Math.max(normalizedUserAmount, 0),
    };
  } catch {
    return {
      actualRefundAmount: safeDeductedAmount,
      isPartialRefund: false,
      loanRepaymentAmount: 0,
      userAmount: safeDeductedAmount,
    };
  }
}

function isWithinDateWindow(timestamp: string, date: Date | null): boolean {
  if (!date) return true;
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  const diffDays = Math.abs(t - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= DATE_WINDOW_DAYS;
}

function matchesPackageName(
  candidates: (string | null | undefined)[],
  packageName: string | null,
): boolean {
  if (!packageName) return true;
  const needle = packageName.toLowerCase();
  return candidates.some((c) => !!c && c.toLowerCase().includes(needle));
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @Inject("SOURCE_DATA_SOURCE") private readonly sourceDataSource: DataSource,
    @InjectRepository(RefundRequest)
    private readonly refundRequestRepo: Repository<RefundRequest>,
    @InjectRepository(RefundCase)
    private readonly refundCaseRepo: Repository<RefundCase>,
    private readonly inquiryService: InquiryService,
  ) { }

  async getMsisdnHistory(
    msisdn: string,
    filters: HistoryFilters,
  ): Promise<HistoryRecord[]> {
    const { amount, date, packageName, includeEra1, era } = filters;

    this.logger.log(
      `[History] Fetching history for MSISDN/Ref: ${msisdn}, amount: ${amount}, date: ${date}, packageName: ${packageName}, includeEra1: ${includeEra1}, era: ${era}`,
    );

    const queryStr = msisdn.trim();
    const queryUpper = queryStr.toUpperCase();

    // Check prefix formats to optimize lookup
    const isInv = queryUpper.startsWith("INV"); // Era 2 Easypaisa
    const isRox = queryUpper.startsWith("ROX"); // Era 2 JazzCash
    const isEp = queryUpper.startsWith("EP");   // Era 3 Easypaisa
    const isJc = queryUpper.startsWith("JC");   // Era 3 JazzCash
    const isT = queryUpper.startsWith("T");     // Era 2 or 3 Card
    const isLetterStart = /^[A-Z]/.test(queryUpper);

    let isTxnRef = false;
    let runEra3 = true;
    let runEra2 = true;
    let runEra1 = !!includeEra1;

    if (isLetterStart) {
      isTxnRef = true;
      runEra1 = false; // Transaction references do not run Era 1 by default unless we fall back, but Era 1 doesn't have standard letters like JC/EP

      if (isInv || isRox) {
        runEra3 = false;
        runEra2 = true;
      } else if (isEp || isJc) {
        runEra3 = true;
        runEra2 = false;
      } else if (isT) {
        runEra3 = true;
        runEra2 = true;
      } else {
        runEra3 = true;
        runEra2 = true;
      }
    }

    // Intersect with user's selected era filter
    // era option: 'all' | 'fintech' | 'old'
    if (era === "fintech") {
      if (isInv || isRox) {
        // User wants fintech only, but this ref is INV/ROX (which is old only).
        return [];
      }
      runEra3 = true;
      runEra2 = false;
      runEra1 = false;
    } else if (era === "old") {
      if (isEp || isJc) {
        // User wants old only, but this ref is EP/JC (which is fintech only).
        return [];
      }
      runEra3 = false;
      runEra2 = true;
      runEra1 = false;
    }

    const promises: Promise<HistoryRecord[]>[] = [];

    if (runEra3) {
      promises.push(this.getFintechEraHistory(queryStr, amount, packageName, isTxnRef));
    } else {
      promises.push(Promise.resolve([]));
    }

    if (runEra2) {
      promises.push(this.getLegacyFulfillmentHistory(queryStr, amount, packageName, isTxnRef));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [era3Records, era2Records] = await Promise.all(promises);
    let records = [...era3Records, ...era2Records];

    const shouldRunEra1 = runEra1 || (!!date && date.getTime() < ERA1_CUTOFF.getTime());
    if (shouldRunEra1) {
      const era1Records = await this.getLegacyJourneyHistory(
        queryStr,
        amount,
        packageName,
        isTxnRef,
      );
      records = [...records, ...era1Records];
    }

    if (records.length > 0) {
      const refs = records.map((r) => r.transactionReference).filter(Boolean);
      if (refs.length > 0) {
        try {
          const requests = await this.refundRequestRepo.find({
            where: { transactionReference: In(refs) }
          });
          const requestMap = new Map<string, RefundRequest>();
          for (const req of requests) {
            requestMap.set(req.transactionReference, req);
          }
          for (const r of records) {
            const matchedReq = requestMap.get(r.transactionReference);
            if (matchedReq) {
              r.refundRequestStatus = matchedReq.status;
              r.refundRequestId = matchedReq.id;
              r.refundPostedBy = matchedReq.requestedBy;
              r.refundReviewedBy = matchedReq.reviewedBy;
              r.refundApprovedBy = matchedReq.approvedBy;
              r.refundApiResponse = matchedReq.refundGatewayResponse ? JSON.stringify(matchedReq.refundGatewayResponse) : null;
              r.requestReason = matchedReq.requestReason;
              r.overrideJustification = matchedReq.overrideJustification;
              r.reviewComment = matchedReq.reviewComment;
            } else {
              // Edge case: local status failed/unpaid but inquiry is success and reversed (already refunded)
              const isPaymentFailed = r.paymentStatus !== "COMPLETED" && r.paymentStatus !== "SUCCESS" && r.paymentStatus !== "PAID" && r.paymentStatus !== "VERIFIED";
              const isInquiryReversed = r.inquiry?.triggered && r.inquiry?.status === "API Confirmed Paid (Reversed)";

              if (isPaymentFailed && isInquiryReversed) {
                try {
                  this.logger.log(`[History] Auto-storing pre-reversed transaction: ref=${r.transactionReference}`);
                  const normalizedMsisdn = toSubscriberFormat(r.mobileNumber || r.walletNumber || msisdn);

                  let paymentMethodEnum: any = null;
                  const pmUpper = String(r.paymentMethod || "")
                    .toUpperCase()
                    .replace(/_/g, "");
                  if (pmUpper === "EASYPAISA") paymentMethodEnum = "Easy_Paisa";
                  else if (pmUpper === "JAZZCASH") paymentMethodEnum = "Jazz_Cash";
                  else if (pmUpper === "CARD" || pmUpper === "MCBCARD") paymentMethodEnum = "Card";

                  // Create RefundCase in status REFUNDED
                  const newCase = this.refundCaseRepo.create({
                    caseNumber: `RC-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    msisdn: normalizedMsisdn,
                    amount: Number(r.amountDeducted) || 0,
                    paymentMethod: paymentMethodEnum,
                    accountNumber: r.walletNumber || null,
                    packageCode: r.packageName || null,
                    orderId: r.orderId || r.paymentOrderId || r.transactionReference || null,
                    transactionDatetime: r.timestamp ? new Date(r.timestamp) : new Date(),
                    status: RefundCaseStatus.REFUNDED,
                    refundStatus: RefundStatus.SUCCESS,
                    refundDescription: "Transaction was fully reversed/refunded by gateway (auto-detected).",
                    verificationResult: VerificationResult.APPROVED,
                    verificationComment: "System auto-approved: Transaction was fully reversed/refunded at the gateway.",
                    verifiedAt: new Date(),
                    verifiedBy: "SYSTEM",
                    refundProcessedAt: new Date(),
                    refundProcessedBy: "SYSTEM",
                    sourceSnapshot: r,
                    createdBy: "SYSTEM",
                  });
                  const savedCase = await this.refundCaseRepo.save(newCase);

                  // Create RefundRequest in status REFUNDED
                  const newRequest = this.refundRequestRepo.create({
                    msisdn: normalizedMsisdn,
                    refundCaseId: savedCase.id,
                    era: r.era,
                    tableName: r.tableName,
                    transactionReference: r.transactionReference,
                    orderId: r.orderId || null,
                    paymentOrderId: r.paymentOrderId || null,
                    paymentMethod: r.paymentMethod || null,
                    packageName: r.packageName || null,
                    amountDeducted: Number(r.amountDeducted) || 0,
                    loanAmount: Number(r.loanAmount) || 0,
                    userAmount: Number(r.userAmount) || 0,
                    isPartialRefund: !!r.isPartialRefund,
                    requestedRefundAmount: Number(r.userAmount) || 0,
                    paymentStatus: r.paymentStatus || null,
                    packagePosted: r.packagePosted || null,
                    fulfillmentStatus: r.fulfillmentStatus || null,
                    errorMessage: r.errorMessage || null,
                    fulfillmentMessage: r.fulfillmentMessage || null,
                    refundEligibility: r.refundEligibility || null,
                    sourceTimestamp: r.timestamp ? new Date(r.timestamp) : null,
                    mobileNumber: r.mobileNumber || null,
                    walletNumber: r.walletNumber || null,
                    inquirySnapshot: r.inquiry || null,
                    requestReason: "Auto-created: Payment failed but inquiry confirmed it was reversed/refunded at gateway.",
                    isOverride: false,
                    requiresOverrideApproval: false,
                    status: RefundRequestStatus.REFUNDED,
                    requestedBy: "SYSTEM",
                    reviewedBy: "SYSTEM",
                    reviewedAt: new Date(),
                    approvedBy: "SYSTEM",
                    approvedAt: new Date(),
                    refundProcessedAt: new Date(),
                    refundGatewayResponse: r.inquiry?.raw || null,
                  });
                  const savedRequest = await this.refundRequestRepo.save(newRequest);

                  r.refundRequestStatus = savedRequest.status;
                  r.refundRequestId = savedRequest.id;

                  requestMap.set(r.transactionReference, savedRequest);
                } catch (dbErr: any) {
                  this.logger.error(`[History] Failed to auto-store reversed transaction ${r.transactionReference}: ${dbErr.message}`);
                }
              }
            }
          }
        } catch (e) {
          this.logger.error(`[History] Failed to load associated refund requests: ${e.message}`);
        }
      }
    }

    if (date) {
      records = records.filter((r) => isWithinDateWindow(r.timestamp, date));
    }

    records.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return records;
  }

  /**
   * Era 3 — Fintech Records. Adapted from verifyFintechEra, but records are
   * never dropped for looking unpaid; unpaid rows get an inquiry annotation instead.
   */
  private async getFintechEraHistory(
    msisdn: string,
    amount: number | null,
    packageName: string | null,
    isTxnRef: boolean = false,
  ): Promise<HistoryRecord[]> {
    const msisdnVariants = isTxnRef ? [] : buildMsisdnVariants(msisdn);

    let joinedRows: any[];
    try {
      if (isTxnRef) {
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
              s.payment_key AS sub_payment_key,
              s.payment_method AS sub_payment_method,
              s.balance_charge_amount AS sub_balance_charge_amount,
              s.external_charge_amount AS sub_external_charge_amount,
              b.name AS bundle_name,
              b.code AS bundle_code
            FROM \`Fintech_payments\`.\`transactions\` t
            INNER JOIN \`fintech_subscription\`.\`subscriptions\` s
              ON s.payment_order_id = t.payment_order_id
            LEFT JOIN \`fintech_subscription\`.\`bundles\` b
              ON s.bundle_id = b.id
            WHERE t.txn_reference = ?
            ORDER BY t.created_at DESC
          `,
          [msisdn],
        );

        // Some transactions never get a txn_reference written on the transactions
        // row itself — the gateway's reference only shows up in the raw event
        // payload (Fintech_payments.events.payload.orderId). Fall back to that
        // before giving up on the lookup.
        if (joinedRows.length === 0) {
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
                  s.payment_key AS sub_payment_key,
                  s.payment_method AS sub_payment_method,
                  s.balance_charge_amount AS sub_balance_charge_amount,
                  s.external_charge_amount AS sub_external_charge_amount,
                  b.name AS bundle_name,
                  b.code AS bundle_code
                FROM \`Fintech_payments\`.\`events\` e
                INNER JOIN \`Fintech_payments\`.\`transactions\` t
                  ON t.id = e.transaction_id
                INNER JOIN \`fintech_subscription\`.\`subscriptions\` s
                  ON s.payment_order_id = t.payment_order_id
                LEFT JOIN \`fintech_subscription\`.\`bundles\` b
                  ON s.bundle_id = b.id
                WHERE JSON_UNQUOTE(JSON_EXTRACT(e.payload, '$.orderId')) = ?
                ORDER BY t.created_at DESC
              `,
              [msisdn],
            );
          } catch (e: any) {
            this.logger.error(
              `[History][Era 3] Events-payload fallback query error: ${e.message}`,
            );
          }
        }
      } else {
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
              s.payment_key AS sub_payment_key,
              s.payment_method AS sub_payment_method,
              s.balance_charge_amount AS sub_balance_charge_amount,
              s.external_charge_amount AS sub_external_charge_amount,
              b.name AS bundle_name,
              b.code AS bundle_code
            FROM \`fintech_subscription\`.\`subscriptions\` s
            INNER JOIN \`Fintech_payments\`.\`transactions\` t
              ON s.payment_order_id = t.payment_order_id
            LEFT JOIN \`fintech_subscription\`.\`bundles\` b
              ON s.bundle_id = b.id
            WHERE s.mobile_number IN (${msisdnVariants.map(() => "?").join(", ")})
               OR s.wallet_number IN (${msisdnVariants.map(() => "?").join(", ")})
            ORDER BY t.created_at DESC
          `,
          [...msisdnVariants, ...msisdnVariants],
        );
      }
    } catch (e: any) {
      this.logger.error(`[History][Era 3] Query error: ${e.message}`);
      return [];
    }

    // Same underlying bug can surface for mobile/wallet searches too: some
    // transactions rows just never got txn_reference populated. Batch-backfill
    // it from the events payload for whichever rows in this result set are
    // missing it, instead of trusting the (possibly blank) column.
    const idsMissingRef = [
      ...new Set(joinedRows.filter((r) => !r.txn_reference).map((r) => r.id)),
    ];
    if (idsMissingRef.length > 0) {
      try {
        const events = await this.sourceDataSource.query(
          `
            SELECT transaction_id, JSON_UNQUOTE(JSON_EXTRACT(payload, '$.orderId')) AS order_id
            FROM \`Fintech_payments\`.\`events\`
            WHERE transaction_id IN (${idsMissingRef.map(() => "?").join(", ")})
              AND JSON_EXTRACT(payload, '$.orderId') IS NOT NULL
          `,
          idsMissingRef,
        );
        const orderIdByTransactionId = new Map<any, string>();
        for (const ev of events) {
          if (!orderIdByTransactionId.has(ev.transaction_id) && ev.order_id) {
            orderIdByTransactionId.set(ev.transaction_id, ev.order_id);
          }
        }
        for (const row of joinedRows) {
          if (!row.txn_reference && orderIdByTransactionId.has(row.id)) {
            row.txn_reference = orderIdByTransactionId.get(row.id);
          }
        }
      } catch (e: any) {
        this.logger.error(
          `[History][Era 3] Events-payload backfill query error: ${e.message}`,
        );
      }
    }

    const results: HistoryRecord[] = [];

    for (const row of joinedRows) {
      const paymentOrderId = row.payment_order_id;
      // txn_reference can be blank on the transactions row itself — when we
      // matched via the events-payload fallback, the search term *is* the
      // gateway orderId, so use that as the reference.
      const transactionReference = row.txn_reference || (isTxnRef ? msisdn : "");
      const dbAmount = Number(row.amount);
      const dbStatus = String(row.transaction_status || "").toUpperCase();
      const paymentKey = String(row.sub_payment_key || "").toUpperCase();
      const createdAt = row.created_at
        ? new Date(row.created_at).toISOString()
        : "";
      const loanAmount = Number(row.loan_charge_amount || 0);
      const bundleName: string | null = row.bundle_name || null;
      const bundleCode: string | null = row.bundle_code || null;

      const isAmountMatch =
        amount === null ||
        Math.abs(dbAmount - amount) < 0.01 ||
        Math.abs(dbAmount - (amount + loanAmount)) < 0.01;
      if (!isAmountMatch) continue;

      if (!matchesPackageName([bundleName, bundleCode], packageName)) continue;

      const { isPaid, inquiry } = await this.resolvePaidStatus(
        dbStatus === "COMPLETED",
        paymentKey,
        transactionReference || paymentOrderId,
      );

      let packagePosted: "Yes" | "No" | "Not Applicable" = "Not Applicable";
      let fulfillmentStatus = "N/A (Payment not confirmed paid)";
      let refundEligibility: "Eligible" | "Ineligible" | "Not Applicable" =
        "Not Applicable";
      let actualRefundAmount = 0;
      let isPartialRefund = false;
      let userAmount = Math.max(dbAmount - loanAmount, 0);
      let errorMessage: string | null = null;

      if (isPaid) {
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
          this.logger.error(
            `[History][Era 3] Fulfillment query error for ${paymentOrderId}: ${e.message}`,
          );
        }

        packagePosted = "No";
        fulfillmentStatus = "MISSING";
        if (fulfillments.length > 0) {
          fulfillmentStatus = String(
            fulfillments[0].fulfillment_status || "",
          ).toUpperCase();
          errorMessage = fulfillments[0].error_message || null;
          const hasSuccess = fulfillments.some(
            (f) => String(f.fulfillment_status).toUpperCase() === "SUCCESS",
          );
          packagePosted = hasSuccess ? "Yes" : "No";
        }

        isPartialRefund = loanAmount > 0;
        const isReversed = inquiry.status === "API Confirmed Paid (Reversed)";
        actualRefundAmount =
          packagePosted === "No" ? (isReversed ? 0 : userAmount) : 0;
        refundEligibility = (packagePosted === "No" && !isReversed) ? "Eligible" : "Ineligible";
      }

      let paymentMethodStr = "Easy_Paisa";
      let paymentModeStr = "3pp";
      const pmMode = String(row.sub_payment_method || "").toUpperCase();
      const pmKey = String(row.sub_payment_key || "").toUpperCase();

      if (pmKey === "JAZZCASH") {
        paymentMethodStr = "Jazz_Cash";
      } else if (pmKey === "CARD") {
        paymentMethodStr = "Card";
      } else if (pmKey === "JAZZ_BALANCE" || pmKey === "JAZZBALANCE") {
        paymentMethodStr = "Jazz_Balance";
        paymentModeStr = "jazzbalance";
      }

      if (pmMode === "DUAL") {
        paymentModeStr = "dual";
        const ref = String(transactionReference || paymentOrderId || "").toUpperCase();
        if (ref.startsWith("JC") || ref.startsWith("ROX")) {
          paymentMethodStr = "Jazz_Cash";
        } else if (ref.startsWith("T")) {
          paymentMethodStr = "Card";
        } else if (ref.startsWith("EP")) {
          paymentMethodStr = "Easy_Paisa";
        }
      } else if (pmMode === "JAZZ_BALANCE" || pmMode === "JAZZBALANCE") {
        paymentModeStr = "jazzbalance";
        paymentMethodStr = "Jazz_Balance";
      }

      const balanceChargeAmount = row.sub_balance_charge_amount != null ? Number(row.sub_balance_charge_amount) : null;
      const externalChargeAmount = row.sub_external_charge_amount != null ? Number(row.sub_external_charge_amount) : null;

      results.push({
        era: 3,
        tableName:
          "fintech_subscription.subscriptions + Fintech_payments.transactions + fintech_subscription.subscription_fulfillment_requests",
        transactionReference,
        orderId: paymentOrderId,
        paymentOrderId,
        paymentMethod: paymentMethodStr,
        paymentMode: paymentModeStr,
        packageName: bundleName || bundleCode,
        amountDeducted: dbAmount,
        paymentStatus: dbStatus,
        packagePosted,
        fulfillmentStatus,
        errorMessage,
        refundEligibility,
        actualRefundAmount,
        isPartialRefund,
        loanAmount,
        userAmount,
        balanceChargeAmount,
        externalChargeAmount,
        timestamp: createdAt,
        mobileNumber: row.sub_mobile_number || "",
        walletNumber: row.sub_wallet_number || row.account_no || "",
        inquiry,
      });
    }

    return results;
  }

  /**
   * Era 2 — Legacy Fulfillment. Adapted from legacy-fulfillment.ts (rox_app.subscription_fulfillment_requests).
   */
  private async getLegacyFulfillmentHistory(
    msisdn: string,
    amount: number | null,
    packageName: string | null,
    isTxnRef: boolean = false,
  ): Promise<HistoryRecord[]> {
    const msisdnVariants = isTxnRef ? [] : buildMsisdnVariants(msisdn);

    // Wallet number lives on the payment-gateway's own table (not on the
    // fulfillment row itself), so a wallet-number search has to join out to
    // both EasyPaisa and JazzCash's payment tables via payment_gateway_ref.
    // Also gives us the wallet number for display in one round trip instead
    // of the old per-row getEra2WalletNumber() follow-up query.
    const walletJoin = `
      FROM \`rox_app\`.\`subscription_fulfillment_requests\` f
      LEFT JOIN \`rox_easypaisa\`.\`easypaisa_transactions\` ep
        ON ep.orderId = f.payment_gateway_ref
      LEFT JOIN \`rox_jazz_payments\`.\`transaction\` jc
        ON jc.txnRefNo = f.payment_gateway_ref
    `;
    const walletSelect = `COALESCE(ep.mobileAccountNo, jc.walletAccountNumber) AS wallet_number`;

    let rows: any[];
    try {
      if (isTxnRef) {
        rows = await this.sourceDataSource.query(
          `
            SELECT f.transaction_id, f.mobile_number, f.service_type, f.service_code, f.fulfillment_price,
                   f.payment_method, f.payment_status, f.payment_gateway_ref, f.amount_deducted,
                   f.fulfillment_status, f.fulfillment_message, f.error_message, f.metadata, f.created_at,
                   ${walletSelect}
            ${walletJoin}
            WHERE f.transaction_id = ? OR f.payment_gateway_ref = ?
            ORDER BY f.created_at DESC
          `,
          [msisdn, msisdn],
        );
      } else {
        rows = await this.sourceDataSource.query(
          `
            SELECT f.transaction_id, f.mobile_number, f.service_type, f.service_code, f.fulfillment_price,
                   f.payment_method, f.payment_status, f.payment_gateway_ref, f.amount_deducted,
                   f.fulfillment_status, f.fulfillment_message, f.error_message, f.metadata, f.created_at,
                   ${walletSelect}
            ${walletJoin}
            WHERE f.mobile_number IN (${msisdnVariants.map(() => "?").join(", ")})
               OR f.transaction_id IN (${msisdnVariants.map(() => "?").join(", ")})
               OR f.payment_gateway_ref IN (${msisdnVariants.map(() => "?").join(", ")})
               /* Wallet-number search temporarily disabled — join stays (still
                  used to display wallet_number on matched rows), just not
                  used to find rows by wallet number for now:
               OR ep.mobileAccountNo IN (...)
               OR jc.walletAccountNumber IN (...) */
            ORDER BY f.created_at DESC
          `,
          [...msisdnVariants, ...msisdnVariants, ...msisdnVariants],
        );
      }
    } catch (e:any) {
      this.logger.error(`[History][Era 2] Query error: ${e.message}`);
      return [];
    }

    const results: HistoryRecord[] = [];

    for (const row of rows) {
      const txId = row.transaction_id;
      const gatewayRef = row.payment_gateway_ref || "";
      const price = Number(row.amount_deducted || row.fulfillment_price);
      const dbPayStatus = String(row.payment_status || "").toUpperCase();
      const dbFulfillStatus = String(
        row.fulfillment_status || "",
      ).toUpperCase();
      const paymentMethod = String(row.payment_method || "")
        .toUpperCase()
        .replace(/_/g, "");
      const createdAt = row.created_at
        ? new Date(row.created_at).toISOString()
        : "";
      const fulfillMessage = row.fulfillment_message || "";
      const errorMessage: string | null = row.error_message || null;
      const serviceType: string | null = row.service_type || null;
      const serviceCode: string | null = row.service_code || null;

      const refundDetails = calculateActualRefundAmount(price, row.metadata);

      const isAmountMatch =
        amount === null ||
        Math.abs(price - amount) < 0.01 ||
        Math.abs(refundDetails.userAmount - amount) < 0.01;
      if (!isAmountMatch) continue;

      if (!matchesPackageName([serviceType, serviceCode], packageName))
        continue;

      const dbSaysPaid =
        dbPayStatus === "SUCCESS" ||
        dbPayStatus === "PAID" ||
        dbPayStatus === "VERIFIED";
      const { isPaid, inquiry } = await this.resolvePaidStatus(
        dbSaysPaid,
        paymentMethod,
        gatewayRef || txId,
      );

      let packagePosted: "Yes" | "No" | "Not Applicable" = "Not Applicable";
      let fulfillmentStatus = "N/A (Payment not confirmed paid)";
      let refundEligibility: "Eligible" | "Ineligible" | "Not Applicable" =
        "Not Applicable";
      let actualRefundAmount = 0;

      if (isPaid) {
        packagePosted =
          dbFulfillStatus === "SUCCESS" || dbFulfillStatus === "RECHARGE_POSTED"
            ? "Yes"
            : "No";
        fulfillmentStatus = dbFulfillStatus || fulfillMessage || "MISSING";
        const isReversed = inquiry.status === "API Confirmed Paid (Reversed)";
        actualRefundAmount =
          packagePosted === "No"
            ? isReversed
              ? 0
              : refundDetails.actualRefundAmount
            : 0;
        refundEligibility = (packagePosted === "No" && !isReversed) ? "Eligible" : "Ineligible";
      }

      let paymentMethodStr = "Easy_Paisa";
      let paymentModeStr = "3pp";
      const pmUpper = String(row.payment_method || "").toUpperCase().replace(/_/g, "");
      if (pmUpper === "JAZZCASH") {
        paymentMethodStr = "Jazz_Cash";
      } else if (pmUpper === "CARD") {
        paymentMethodStr = "Card";
      } else if (pmUpper === "JAZZBALANCE") {
        paymentMethodStr = "Jazz_Balance";
        paymentModeStr = "jazzbalance";
      } else if (pmUpper === "DUAL") {
        const refUpper = String(gatewayRef).toUpperCase();
        if (refUpper.startsWith("INV")) {
          paymentMethodStr = "Easy_Paisa";
        } else if (refUpper.startsWith("ROX")) {
          paymentMethodStr = "Jazz_Cash";
        } else if (refUpper.startsWith("T")) {
          paymentMethodStr = "Card";
        } else {
          paymentMethodStr = "Jazz_Cash"; // fallback
        }
        paymentModeStr = "dual";
      }

      let balanceChargeAmount = null;
      let externalChargeAmount = null;
      if (paymentModeStr === "dual") {
        const fullPrice = Number(row.fulfillment_price || 0);
        const amtDeducted = Number(row.amount_deducted || 0);
        balanceChargeAmount = Math.max(fullPrice - amtDeducted, 0);
        externalChargeAmount = amtDeducted;
      }

      const walletNumber = row.wallet_number || null;

      results.push({
        era: 2,
        tableName: "rox_app.subscription_fulfillment_requests",
        transactionReference: gatewayRef,
        orderId: txId,
        tid: txId,
        paymentMethod: paymentMethodStr,
        paymentMode: paymentModeStr,
        packageName: serviceCode || serviceType,
        amountDeducted: price,
        paymentStatus: dbPayStatus,
        packagePosted,
        fulfillmentStatus,
        errorMessage,
        fulfillmentMessage: fulfillMessage || null,
        refundEligibility,
        actualRefundAmount,
        isPartialRefund: refundDetails.isPartialRefund,
        loanAmount: refundDetails.loanRepaymentAmount,
        userAmount: refundDetails.userAmount,
        balanceChargeAmount,
        externalChargeAmount,
        timestamp: createdAt,
        mobileNumber: row.mobile_number || "",
        walletNumber: walletNumber || "",
        inquiry,
      });
    }

    return results;
  }

  /**
   * Era 1 — Legacy Journey. Adapted from legacy-journey.ts, cross-checking
   * rox_app.transactions for journey logs and package identification
   * (bundle_code / transaction_for) instead of a separate lookup.
   */
  private async getLegacyJourneyHistory(
    msisdn: string,
    amount: number | null,
    packageName: string | null,
    isTxnRef: boolean = false,
  ): Promise<HistoryRecord[]> {
    const msisdnVariants = isTxnRef ? [] : buildMsisdnVariants(msisdn);

    type Candidate = {
      transactionReference: string;
      orderId: string;
      amount: number;
      dbStatus: string;
      provider: "EasyPaisa" | "JazzCash";
      createdAt: Date;
      walletNumber?: string;
      mobileNumber?: string;
    };

    const candidates: Candidate[] = [];

    try {
      let epRows: any[];
      if (isTxnRef) {
        epRows = await this.sourceDataSource.query(
          `
            SELECT id, orderId, transactionAmount, paymentStatus, createdAt, mobileAccountNo, msisdn
            FROM \`rox_easypaisa\`.\`easypaisa_transactions\`
            WHERE id = ? OR orderId = ?
            ORDER BY createdAt DESC
          `,
          [msisdn, msisdn],
        );
      } else {
        epRows = await this.sourceDataSource.query(
          `
            SELECT id, orderId, transactionAmount, paymentStatus, createdAt, mobileAccountNo, msisdn
            FROM \`rox_easypaisa\`.\`easypaisa_transactions\`
            WHERE mobileAccountNo IN (${msisdnVariants.map(() => "?").join(", ")})
               OR msisdn IN (${msisdnVariants.map(() => "?").join(", ")})
            ORDER BY createdAt DESC
          `,
          [...msisdnVariants, ...msisdnVariants],
        );
      }

      for (const row of epRows) {
        const rowAmount = Number(row.transactionAmount);
        if (amount !== null && Math.abs(rowAmount - amount) >= 0.01) continue;
        candidates.push({
          transactionReference: row.id,
          orderId: row.orderId,
          amount: rowAmount,
          dbStatus: String(row.paymentStatus || "").toUpperCase(),
          provider: "EasyPaisa",
          createdAt: new Date(row.createdAt),
          walletNumber: row.mobileAccountNo || "",
          mobileNumber: row.msisdn || "",
        });
      }
    } catch (e) {
      this.logger.error(`[History][Era 1] EasyPaisa query error: ${e.message}`);
    }

    try {
      let jcRows: any[];
      if (isTxnRef) {
        jcRows = await this.sourceDataSource.query(
          `
            SELECT id, txnRefNo, amount, status, created_at, walletAccountNumber, mobileNumber
            FROM \`rox_jazz_payments\`.\`transaction\`
            WHERE id = ? OR txnRefNo = ?
            ORDER BY created_at DESC
          `,
          [msisdn, msisdn],
        );
      } else {
        jcRows = await this.sourceDataSource.query(
          `
            SELECT id, txnRefNo, amount, status, created_at, walletAccountNumber, mobileNumber
            FROM \`rox_jazz_payments\`.\`transaction\`
            WHERE (walletAccountNumber IN (${msisdnVariants.map(() => "?").join(", ")})
               OR mobileNumber IN (${msisdnVariants.map(() => "?").join(", ")})
               OR txnRefNo IN (${msisdnVariants.map(() => "?").join(", ")}))
            ORDER BY created_at DESC
          `,
          [...msisdnVariants, ...msisdnVariants, ...msisdnVariants],
        );
      }

      for (const row of jcRows) {
        const rowAmount = Number(row.amount);
        if (amount !== null && Math.abs(rowAmount - amount) >= 0.01) continue;
        candidates.push({
          transactionReference: row.id,
          orderId: row.txnRefNo,
          amount: rowAmount,
          dbStatus: String(row.status || "").toUpperCase(),
          provider: "JazzCash",
          createdAt: new Date(row.created_at),
          walletNumber: row.walletAccountNumber || "",
          mobileNumber: row.mobileNumber || "",
        });
      }
    } catch (e) {
      this.logger.error(`[History][Era 1] JazzCash query error: ${e.message}`);
    }

    const results: HistoryRecord[] = [];

    for (const candidate of candidates) {
      const dbSaysPaid =
        candidate.dbStatus === "SUCCESS" ||
        candidate.dbStatus === "COMPLETED" ||
        candidate.dbStatus === "VERIFIED";
      const { isPaid, inquiry } = await this.resolvePaidStatus(
        dbSaysPaid,
        candidate.provider === "EasyPaisa" ? "EASYPAISA" : "JAZZCASH",
        candidate.orderId || candidate.transactionReference,
      );

      let packagePosted: "Yes" | "No" | "Not Applicable" = "Not Applicable";
      let fulfillmentStatus = "N/A (Payment not confirmed paid)";
      let refundEligibility: "Eligible" | "Ineligible" | "Not Applicable" =
        "Not Applicable";
      let actualRefundAmount = 0;
      let loanAmount = 0;
      let isPartialRefund = false;
      let userAmount = candidate.amount;
      let matchedPackageName: string | null = null;

      if (isPaid) {
        const candidateMsisdn = candidate.mobileNumber || candidate.walletNumber || msisdn;
        const candidateMsisdnVariants = buildMsisdnVariants(candidateMsisdn);

        const windowStart = new Date(candidate.createdAt.getTime() - 60000);
        const windowEnd = new Date(candidate.createdAt.getTime() + 300000);

        let journeyLogs: any[] = [];
        try {
          journeyLogs = await this.sourceDataSource.query(
            `
              SELECT stage, status, message, created_at, transaction_for, bundle_code
              FROM \`rox_app\`.\`transactions\`
              WHERE msisdn IN (${candidateMsisdnVariants.map(() => "?").join(", ")})
                AND created_at BETWEEN ? AND ?
              ORDER BY created_at ASC
            `,
            [...candidateMsisdnVariants, windowStart, windowEnd],
          );
        } catch (e) {
          this.logger.error(
            `[History][Era 1] Journey log query error: ${e.message}`,
          );
        }

        if (journeyLogs.length > 0) {
          matchedPackageName =
            journeyLogs.find((l) => l.bundle_code)?.bundle_code ||
            journeyLogs.find((l) => l.transaction_for)?.transaction_for ||
            null;

          fulfillmentStatus = String(
            journeyLogs[journeyLogs.length - 1].status || "",
          ).toUpperCase();
          const successLog = journeyLogs.find((log) =>
            isSuccessLog(log.stage, log.status, log.message),
          );
          packagePosted = successLog ? "Yes" : "No";
        } else {
          packagePosted = "No";
          fulfillmentStatus = "MISSING";
        }

        if (!matchesPackageName([matchedPackageName], packageName)) continue;

        if (packagePosted === "No") {
          try {
            const [rechargesV1, rechargesV2] = await Promise.all([
              this.sourceDataSource.query(
                `
                  SELECT amount, status
                  FROM \`rox_app\`.\`recharge_transactions_v1\`
                  WHERE customer_msisdn IN (${candidateMsisdnVariants.map(() => "?").join(", ")})
                    AND time_stamp BETWEEN ? AND ?
                    AND UPPER(status) = 'SUCCESS'
                  ORDER BY time_stamp DESC
                  LIMIT 1
                `,
                [...candidateMsisdnVariants, windowStart, windowEnd],
              ),
              this.sourceDataSource.query(
                `
                  SELECT amount, status
                  FROM \`rox_app\`.\`recharge_transactions_v2\`
                  WHERE customer_msisdn IN (${candidateMsisdnVariants.map(() => "?").join(", ")})
                    AND time_stamp BETWEEN ? AND ?
                    AND UPPER(status) = 'SUCCESS'
                  ORDER BY time_stamp DESC
                  LIMIT 1
                `,
                [...candidateMsisdnVariants, windowStart, windowEnd],
              ),
            ]);

            const rechargeV1 =
              rechargesV1.length > 0 ? Number(rechargesV1[0].amount || 0) : 0;
            const rechargeV2 =
              rechargesV2.length > 0 ? Number(rechargesV2[0].amount || 0) : 0;
            const totalRecharge = Math.max(rechargeV1, rechargeV2);
            if (totalRecharge > 0) {
              loanAmount = totalRecharge;
              isPartialRefund = true;
              userAmount = Math.max(candidate.amount - loanAmount, 0);
            }
          } catch (e) {
            this.logger.error(
              `[History][Era 1] Recharge lookup error: ${e.message}`,
            );
          }
        }

        const isReversed = inquiry.status === "API Confirmed Paid (Reversed)";
        actualRefundAmount =
          packagePosted === "No" ? (isReversed ? 0 : userAmount) : 0;
        refundEligibility = (packagePosted === "No" && !isReversed) ? "Eligible" : "Ineligible";
      } else if (packageName) {
        // Payment not confirmed paid — no journey logs to check, so a package-name filter can't match.
        continue;
      }

      results.push({
        era: 1,
        tableName:
          candidate.provider === "EasyPaisa"
            ? "rox_easypaisa.easypaisa_transactions + rox_app.transactions"
            : "rox_jazz_payments.transaction + rox_app.transactions",
        transactionReference:
          candidate.orderId || candidate.transactionReference,
        orderId: candidate.orderId || candidate.transactionReference,
        packageName: matchedPackageName,
        amountDeducted: candidate.amount,
        paymentStatus: candidate.dbStatus,
        packagePosted,
        fulfillmentStatus,
        refundEligibility,
        actualRefundAmount,
        isPartialRefund,
        loanAmount,
        userAmount,
        timestamp: candidate.createdAt.toISOString(),
        walletNumber: candidate.walletNumber || "",
        mobileNumber: candidate.mobileNumber || "",
        inquiry,
      });
    }

    return results;
  }

  /**
   * Resolves whether a payment is actually paid, running a live gateway
   * inquiry when the DB status doesn't already say so. Payment methods with
   * no gateway inquiry wired (BNPL/JAZZBALANCE/etc.) are left "Not Triggered".
   */
  private async resolvePaidStatus(
    dbSaysPaid: boolean,
    paymentMethodKey: string,
    inquiryRef: string,
  ): Promise<{ isPaid: boolean; inquiry: InquiryInfo }> {
    if (dbSaysPaid) {
      return {
        isPaid: true,
        inquiry: { triggered: false, provider: null, status: "Not Triggered" },
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
        inquiry: { triggered: false, provider: null, status: "Not Triggered" },
      };
    }

    if (!inquiryRef || !inquiryRef.trim()) {
      return {
        isPaid: false,
        inquiry: { triggered: false, provider: null, status: "Not Triggered (Missing Reference)" },
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
          inquiry: {
            triggered: true,
            provider: "EasyPaisa",
            status: isPaid
              ? isFullyReversed
                ? "API Confirmed Paid (Reversed)"
                : "API Confirmed Paid"
              : "API Confirmed Failed",
            responseCode: body.responseCode,
            responseDesc: body.responseDesc,
            raw: body,
          },
        };
      } catch (error: any) {
        return {
          isPaid: false,
          inquiry: {
            triggered: true,
            provider: "EasyPaisa",
            status: "Inquiry Failed",
            raw: { error: error.message, data: error.response?.data },
          },
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
          inquiry: {
            triggered: true,
            provider: "JazzCash",
            status: isPaid
              ? isFullyReversed
                ? "API Confirmed Paid (Reversed)"
                : "API Confirmed Paid"
              : "API Confirmed Failed",
            responseCode: body.pp_ResponseCode,
            responseDesc: body.pp_ResponseMessage || body.pp_Status,
            raw: body,
          },
        };
      } catch (error: any) {
        return {
          isPaid: false,
          inquiry: {
            triggered: true,
            provider: "JazzCash",
            status: "Inquiry Failed",
            raw: { error: error.message, data: error.response?.data },
          },
        };
      }
    }

    return {
      isPaid: false,
      inquiry: { triggered: false, provider: null, status: "Not Triggered" },
    };
  }
}
