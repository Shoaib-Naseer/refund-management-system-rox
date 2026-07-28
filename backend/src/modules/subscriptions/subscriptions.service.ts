import { Injectable, Logger, Inject } from "@nestjs/common";
import { DataSource, Repository, In, Not } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { buildMsisdnVariants } from "../verification/msisdn-utils";
import {
  RefundRequest,
  RefundRequestStatus,
} from "../../entities/refund-request.entity";

export interface EligibleRecord {
  era: 2 | 3;
  subscriptionType: "Old Subscription" | "New Subscription";
  transactionReference: string;
  orderId: string;
  paymentOrderId?: string;
  paymentMethod: string | null;
  serviceCode: string | null;
  mobileNumber: string;
  walletNumber: string | null;
  amountDeducted: number;
  loanAmount: number;
  userAmount: number;
  actualRefundAmount: number;
  isPartialRefund: boolean;
  paymentStatus: string;
  fulfillmentStatus: string;
  errorMessage: string | null;
  fulfillmentMessage?: string | null;
  timestamp: string;
  refundRequestStatus?: string;
  refundRequestId?: number;
  refundPostedBy?: string | null;
  refundReviewedBy?: string | null;
  refundApprovedBy?: string | null;
  refundApiResponse?: string | null;
  requestReason?: string | null;
  overrideJustification?: string | null;
  reviewComment?: string | null;
}

export interface EligibleFilters {
  dateFrom?: string;
  dateTo?: string;
  refundedAtFrom?: string;
  refundedAtTo?: string;
  paymentMethod?: string;
  packageName?: string;
  refundStatus?: string;
  page: number;
  limit: number;
}

export interface PaginatedEligible {
  data: EligibleRecord[];
  total: number;
  page: number;
  limit: number;
}

function calculateRefund(
  amountDeducted: string | number,
  metadataStr: string | null,
): {
  actualRefundAmount: number;
  isPartialRefund: boolean;
  loanAmount: number;
  userAmount: number;
} {
  const deducted =
    typeof amountDeducted === "number"
      ? amountDeducted
      : Number.parseFloat(amountDeducted || "0");

  if (!metadataStr) {
    return {
      actualRefundAmount: deducted,
      isPartialRefund: false,
      loanAmount: 0,
      userAmount: deducted,
    };
  }

  try {
    const parsed = JSON.parse(metadataStr);
    const loan = Number(parsed.loanAmount ?? 0);
    if (!Number.isFinite(loan) || loan <= 0) {
      return {
        actualRefundAmount: deducted,
        isPartialRefund: false,
        loanAmount: 0,
        userAmount: deducted,
      };
    }
    const normalizedLoan = Math.min(loan, deducted);
    const metaUser = Number(parsed.userAmount ?? NaN);
    const userAmount = Number.isFinite(metaUser)
      ? metaUser
      : Math.max(deducted - normalizedLoan, 0);
    return {
      actualRefundAmount: Math.max(deducted - normalizedLoan, 0),
      isPartialRefund: true,
      loanAmount: normalizedLoan,
      userAmount: Math.max(userAmount, 0),
    };
  } catch {
    return {
      actualRefundAmount: deducted,
      isPartialRefund: false,
      loanAmount: 0,
      userAmount: deducted,
    };
  }
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @Inject("SOURCE_DATA_SOURCE") private readonly sourceDataSource: DataSource,
    @InjectRepository(RefundRequest)
    private readonly refundRequestRepo: Repository<RefundRequest>,
  ) {} /**
   * Era 2 — Old Subscriptions
   * Pulls from rox_app.subscription_fulfillment_requests where DB already
   * confirms payment (SUCCESS/PAID/VERIFIED) but fulfillment is not succeeded.
   */
  async getEligibleOldSubscriptions(
    filters: EligibleFilters,
    excludeSuccess = true,
  ): Promise<PaginatedEligible> {
    const {
      dateFrom,
      dateTo,
      paymentMethod,
      packageName,
      refundStatus,
      page,
      limit,
    } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      `main.payment_status IN ('SUCCESS', 'PAID', 'VERIFIED', 'success', 'paid', 'verified')`,
      `(main.fulfillment_status NOT IN ('SUCCESS', 'RECHARGE_POSTED', 'success', 'recharge_posted') OR main.fulfillment_status IS NULL)`,
    ];
    const params: any[] = [];

    if (dateFrom) {
      conditions.push(`main.created_at >= ?`);
      params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      conditions.push(`main.created_at <= ?`);
      params.push(`${dateTo} 23:59:59`);
    }
    if (!dateFrom && !dateTo) {
      const pktTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const todayStr = pktTime.toISOString().split("T")[0];
      conditions.push(`main.created_at >= ?`);
      params.push(`${todayStr} 00:00:00`);
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      const methods = paymentMethod.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
      if (methods.length > 0) {
        const subConds: string[] = [];
        for (const m of methods) {
          if (m === "EASYPAISA") {
            subConds.push(`main.payment_method LIKE '%easypaisa%' OR main.payment_method LIKE '%easy_paisa%'`);
          } else if (m === "JAZZCASH") {
            subConds.push(`main.payment_method LIKE '%jazzcash%' OR main.payment_method LIKE '%jazz_cash%'`);
          } else if (m === "CARD") {
            subConds.push(`main.payment_method LIKE '%card%'`);
          } else if (m === "JAZZ_BALANCE" || m === "JAZZBALANCE") {
            subConds.push(`main.payment_method LIKE '%jazz_balance%' OR main.payment_method LIKE '%jazzbalance%'`);
          } else if (m === "DUAL") {
            subConds.push(`main.payment_method LIKE '%dual%'`);
          }
        }
        if (subConds.length > 0) {
          conditions.push(`(${subConds.join(' OR ')})`);
        }
      }
    }
    if (packageName) {
      conditions.push(`(main.service_type LIKE ? OR main.service_code LIKE ?)`);
      params.push(`%${packageName}%`, `%${packageName}%`);
    }

    conditions.push(`main.created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`);

    const { refs, mode } = await this.getRefundRefsForFilter(
      refundStatus,
      excludeSuccess,
    );

    if (mode === "IN" && refs.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    if (mode === "IN") {
      conditions.push(
        `COALESCE(NULLIF(main.payment_gateway_ref, ''), main.transaction_id) IN (${refs.map(() => "?").join(",")})`,
      );
      params.push(...refs);
    } else if (mode === "NOT_IN" && refs.length > 0) {
      conditions.push(
        `COALESCE(NULLIF(main.payment_gateway_ref, ''), main.transaction_id) NOT IN (${refs.map(() => "?").join(",")})`,
      );
      params.push(...refs);
    }

    const where = conditions.join(" AND ");

    let total = 0;
    try {
      const countResult = await this.sourceDataSource.query(
        `SELECT COUNT(*) as cnt FROM \`rox_app\`.\`subscription_fulfillment_requests\` main WHERE ${where}`,
        params,
      );
      total = Number(countResult[0]?.cnt ?? 0);
    } catch (e) {
      this.logger.error(`[OldSubscriptions] Count query error: ${e.message}`);
      return { data: [], total: 0, page, limit };
    }

    let rows: any[];
    try {
      rows = await this.sourceDataSource.query(
        `
          SELECT
            main.transaction_id, main.mobile_number, main.service_type, main.service_code,
            main.fulfillment_price, main.payment_method, main.payment_status, main.payment_gateway_ref,
            main.amount_deducted, main.fulfillment_status, main.fulfillment_message,
            main.error_message, main.metadata, main.created_at
          FROM \`rox_app\`.\`subscription_fulfillment_requests\` main
          WHERE ${where}
          ORDER BY main.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      );
    } catch (e) {
      this.logger.error(`[OldSubscriptions] Data query error: ${e.message}`);
      return { data: [], total: 0, page, limit };
    }

    // Fetch wallet numbers for EP/JC rows in one pass
    const walletMap = await this.batchFetchWallets(rows, "era2");

    const data: EligibleRecord[] = rows.map((row) => {
      const price = Number(row.amount_deducted || row.fulfillment_price || 0);
      const refund = calculateRefund(price, row.metadata);
      const pmUpper = String(row.payment_method || "")
        .toUpperCase()
        .replace(/_/g, "");
      const gatewayRef = row.payment_gateway_ref || "";

      let paymentMethodStr = "Easy_Paisa";
      let paymentModeStr = "3pp";

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

      return {
        era: 2,
        subscriptionType: "Old Subscription",
        transactionReference: gatewayRef || row.transaction_id,
        orderId: row.transaction_id,
        paymentMethod: paymentMethodStr,
        paymentMode: paymentModeStr,
        serviceCode: row.service_code || null,
        mobileNumber: row.mobile_number || "",
        walletNumber: walletMap.get(`${pmUpper}:${gatewayRef}`) ?? null,
        amountDeducted: price,
        loanAmount: refund.loanAmount,
        userAmount: refund.userAmount,
        actualRefundAmount: refund.actualRefundAmount,
        isPartialRefund: refund.isPartialRefund,
        balanceChargeAmount,
        externalChargeAmount,
        paymentStatus: String(row.payment_status || "").toUpperCase(),
        fulfillmentStatus: String(
          row.fulfillment_status || row.fulfillment_message || "MISSING",
        ).toUpperCase(),
        errorMessage: row.error_message || null,
        fulfillmentMessage: row.fulfillment_message || null,
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : "",
      };
    });

    const dataWithStatus = await this.attachRefundStatus(data);
    return { data: dataWithStatus, total, page, limit };
  }

  /**
   * Era 3 — New Subscriptions
   * Joins fintech_subscription.subscriptions + Fintech_payments.transactions
   * where payment is COMPLETED but no SUCCESS fulfillment record exists.
   */
  async getEligibleNewSubscriptions(
    filters: EligibleFilters,
    excludeSuccess = true,
  ): Promise<PaginatedEligible> {
    const {
      dateFrom,
      dateTo,
      paymentMethod,
      packageName,
      refundStatus,
      page,
      limit,
    } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      `t.transaction_status IN ('COMPLETED', 'completed')`,
    ];
    const params: any[] = [];

    if (dateFrom) {
      conditions.push(`t.created_at >= ?`);
      params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      conditions.push(`t.created_at <= ?`);
      params.push(`${dateTo} 23:59:59`);
    }
    if (!dateFrom && !dateTo) {
      // Fast path: limit to today if no date filters provided (using PKT UTC+5)
      const pktTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const todayStr = pktTime.toISOString().split("T")[0];
      conditions.push(`t.created_at >= ?`);
      params.push(`${todayStr} 00:00:00`);
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      const methods = paymentMethod.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
      if (methods.length > 0) {
        const subConds: string[] = [];
        for (const m of methods) {
          if (m === "EASYPAISA") {
            subConds.push(`s.payment_key LIKE '%easypaisa%' OR s.payment_key LIKE '%easy_paisa%'`);
          } else if (m === "JAZZCASH") {
            subConds.push(`s.payment_key LIKE '%jazzcash%' OR s.payment_key LIKE '%jazz_cash%'`);
          } else if (m === "CARD") {
            subConds.push(`s.payment_key LIKE '%card%'`);
          } else if (m === "JAZZ_BALANCE" || m === "JAZZBALANCE") {
            subConds.push(`s.payment_key LIKE '%jazz_balance%' OR s.payment_key LIKE '%jazzbalance%'`);
          } else if (m === "DUAL") {
            subConds.push(`s.payment_key = 'DUAL'`);
          }
        }
        if (subConds.length > 0) {
          conditions.push(`(${subConds.join(' OR ')})`);
        }
      }
    }
    if (packageName) {
      conditions.push(`(sfr.bundle_code LIKE ?)`);
      params.push(`%${packageName}%`);
    }

    // Always cap the upper bound to 10 minutes ago to allow delayed fulfillments to finish
    // Delegating to MySQL NOW() ensures perfect timezone compliance regardless of region
    conditions.push(`t.created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`);

    const { refs, mode } = await this.getRefundRefsForFilter(
      refundStatus,
      excludeSuccess,
    );
    if (mode === "IN" && refs.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    if (mode === "IN") {
      conditions.push(
        `COALESCE(NULLIF(t.txn_reference, ''), t.payment_order_id) IN (${refs.map(() => "?").join(",")})`,
      );
      params.push(...refs);
    } else if (mode === "NOT_IN" && refs.length > 0) {
      conditions.push(
        `COALESCE(NULLIF(t.txn_reference, ''), t.payment_order_id) NOT IN (${refs.map(() => "?").join(",")})`,
      );
      params.push(...refs);
    }

    const where = conditions.join(" AND ");

    // Eligible = payment COMPLETED but subscription NOT active-and-fulfilled
    const mismatchCondition = `
      (LOWER(s.status) != 'active' OR sfr.fulfillment_status IS NULL OR LOWER(sfr.fulfillment_status) NOT IN ('success'))
    `;

    this.logger.log(
      `[NewSubscriptions] WHERE: ${where} AND ${mismatchCondition}`,
    );
    this.logger.log(`[NewSubscriptions] params: ${JSON.stringify(params)}`);

    let total = 0;
    try {
      const countResult = await this.sourceDataSource.query(
        `
          SELECT COUNT(*) as cnt
          FROM \`fintech_subscription\`.\`subscriptions\` s
          INNER JOIN \`Fintech_payments\`.\`transactions\` t ON s.payment_order_id = t.payment_order_id
          LEFT JOIN \`fintech_subscription\`.\`subscription_fulfillment_requests\` sfr ON s.order_reference_id = sfr.order_reference_id
          WHERE ${where} AND ${mismatchCondition}
        `,
        params,
      );
      total = Number(countResult[0]?.cnt ?? 0);
      this.logger.log(`[NewSubscriptions] Count result: ${total}`);
    } catch (e) {
      this.logger.error(`[NewSubscriptions] Count query error: ${e.message}`);
      return { data: [], total: 0, page, limit };
    }

    let rows: any[];
    try {
      rows = await this.sourceDataSource.query(
        `
          SELECT
            t.payment_order_id,
            t.txn_reference,
            t.amount,
            t.transaction_status,
            t.created_at,
            t.account_no,
            s.loan_charge_amount,
            s.order_reference_id,
            s.status AS subscription_status,
            s.mobile_number AS sub_mobile_number,
            s.wallet_number AS sub_wallet_number,
            s.payment_key AS sub_payment_key,
            s.payment_method AS sub_payment_method,
            s.balance_charge_amount AS sub_balance_charge_amount,
            s.external_charge_amount AS sub_external_charge_amount,
            sfr.bundle_code AS bundle_code,
            sfr.fulfillment_status AS last_fulfillment_status,
            sfr.error_message AS last_error_message,
            NULL AS last_fulfillment_message
          FROM \`fintech_subscription\`.\`subscriptions\` s
          INNER JOIN \`Fintech_payments\`.\`transactions\` t ON s.payment_order_id = t.payment_order_id
          LEFT JOIN \`fintech_subscription\`.\`subscription_fulfillment_requests\` sfr ON s.order_reference_id = sfr.order_reference_id
          WHERE ${where} AND ${mismatchCondition}
          ORDER BY t.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      );
      this.logger.log(`[NewSubscriptions] Rows returned: ${rows.length}`);
    } catch (e) {
      this.logger.error(`[NewSubscriptions] Data query error: ${e.message}`);
      return { data: [], total: 0, page, limit };
    }

    const data: EligibleRecord[] = rows.map((row) => {
      const dbAmount = Number(row.amount || 0);
      const loanAmount = Number(row.loan_charge_amount || 0);
      const userAmount = Math.max(dbAmount - loanAmount, 0);
      const isPartialRefund = loanAmount > 0;
      const paymentKey = String(row.sub_payment_key || "").toUpperCase();
      const subStatus = String(
        row.subscription_status || "MISSING",
      ).toUpperCase();
      const fulfillmentStatus = row.last_fulfillment_status
        ? String(row.last_fulfillment_status).toUpperCase()
        : "MISSING";
      const isEligible =
        subStatus !== "ACTIVE" && fulfillmentStatus !== "SUCCESS";

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

      if (pmMode === "DUAL" || pmKey === "DUAL") {
        paymentModeStr = "dual";
        const ref = String(row.txn_reference || row.payment_order_id || "").toUpperCase();
        if (ref.startsWith("JC") || ref.startsWith("ROX")) {
          paymentMethodStr = "Jazz_Cash";
        } else if (ref.startsWith("T")) {
          paymentMethodStr = "Card";
        } else if (ref.startsWith("EP")) {
          paymentMethodStr = "Easy_Paisa";
        } else {
          paymentMethodStr = "Jazz_Cash"; // fallback
        }
      } else if (pmMode === "JAZZ_BALANCE" || pmMode === "JAZZBALANCE") {
        paymentModeStr = "jazzbalance";
        paymentMethodStr = "Jazz_Balance";
      }

      const balanceChargeAmount = row.sub_balance_charge_amount != null ? Number(row.sub_balance_charge_amount) : null;
      const externalChargeAmount = row.sub_external_charge_amount != null ? Number(row.sub_external_charge_amount) : null;

      return {
        era: 3,
        subscriptionType: "New Subscription",
        transactionReference: row.txn_reference || row.payment_order_id,
        orderId: row.order_reference_id,
        paymentOrderId: row.payment_order_id,
        paymentMethod: paymentMethodStr,
        paymentMode: paymentModeStr,
        serviceCode: row.bundle_code || null,
        mobileNumber: row.sub_mobile_number || "",
        walletNumber: row.sub_wallet_number || row.account_no || null,
        amountDeducted: dbAmount,
        loanAmount,
        userAmount,
        actualRefundAmount: userAmount,
        isPartialRefund,
        balanceChargeAmount,
        externalChargeAmount,
        paymentStatus: String(row.transaction_status || "").toUpperCase(),
        fulfillmentStatus,
        packagePosted: subStatus,
        refundEligibility: isEligible ? "Eligible" : "Ineligible",
        errorMessage: row.last_error_message || null,
        fulfillmentMessage: row.last_fulfillment_message || null,
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : "",
      };
    });

    const dataWithStatus = await this.attachRefundStatus(data);
    return { data: dataWithStatus, total, page, limit };
  }

  /**
   * Batch-fetch wallet numbers for Era 2 rows to avoid N+1 queries.
   * Returns a map of "PAYMENTMETHOD:gatewayRef" → walletNumber.
   */
  private async batchFetchWallets(
    rows: any[],
    _era: "era2",
  ): Promise<Map<string, string>> {
    const walletMap = new Map<string, string>();

    const epRefs = rows
      .filter(
        (r) =>
          String(r.payment_method || "")
            .toUpperCase()
            .replace(/_/g, "") === "EASYPAISA" && r.payment_gateway_ref,
      )
      .map((r) => r.payment_gateway_ref as string);

    const jcRefs = rows
      .filter(
        (r) =>
          String(r.payment_method || "")
            .toUpperCase()
            .replace(/_/g, "") === "JAZZCASH" && r.payment_gateway_ref,
      )
      .map((r) => r.payment_gateway_ref as string);

    if (epRefs.length > 0) {
      try {
        const epRows = await this.sourceDataSource.query(
          `SELECT orderId, mobileAccountNo FROM \`rox_easypaisa\`.\`easypaisa_transactions\` WHERE orderId IN (${epRefs.map(() => "?").join(",")})`,
          epRefs,
        );
        for (const r of epRows) {
          walletMap.set(`EASYPAISA:${r.orderId}`, r.mobileAccountNo || "");
        }
      } catch (e) {
        this.logger.warn(
          `[OldSubscriptions] EP wallet batch fetch failed: ${e.message}`,
        );
      }
    }

    if (jcRefs.length > 0) {
      try {
        const jcRows = await this.sourceDataSource.query(
          `SELECT txnRefNo, walletAccountNumber FROM \`rox_jazz_payments\`.\`transaction\` WHERE txnRefNo IN (${jcRefs.map(() => "?").join(",")})`,
          jcRefs,
        );
        for (const r of jcRows) {
          walletMap.set(`JAZZCASH:${r.txnRefNo}`, r.walletAccountNumber || "");
        }
      } catch (e) {
        this.logger.warn(
          `[OldSubscriptions] JC wallet batch fetch failed: ${e.message}`,
        );
      }
    }

    return walletMap;
  }

  private async getRefundRefsForFilter(
    refundStatus?: string,
    excludeSuccess = true,
  ): Promise<{ refs: string[]; mode: "IN" | "NOT_IN" | "NONE" }> {
    if (refundStatus === "SUCCESS") {
      const reqs = await this.refundRequestRepo.find({
        select: ["transactionReference"],
        where: { status: RefundRequestStatus.REFUNDED },
      });
      const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
      return { refs, mode: "IN" };
    }

    if (!refundStatus || refundStatus === "ALL") {
      if (excludeSuccess) {
        const reqs = await this.refundRequestRepo.find({
          select: ["transactionReference"],
          where: { status: RefundRequestStatus.REFUNDED },
        });
        const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
        return { refs, mode: "NOT_IN" };
      }
      return { refs: [], mode: "NONE" };
    }

    if (refundStatus === "NOT_REQUESTED") {
      const reqs = await this.refundRequestRepo.find({
        select: ["transactionReference"],
      });
      const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
      return { refs, mode: "NOT_IN" };
    }

    if (refundStatus === "REQUESTED") {
      const reqs = await this.refundRequestRepo.find({
        select: ["transactionReference"],
        where: excludeSuccess
          ? { status: Not(RefundRequestStatus.REFUNDED) }
          : undefined,
      });
      const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
      return { refs, mode: "IN" };
    }

    let dbStatus: RefundRequestStatus | undefined;
    const lower = String(refundStatus).toLowerCase();
    if (lower === "pending") {
      dbStatus = RefundRequestStatus.UNDER_REVIEW;
    } else if (Object.values(RefundRequestStatus).includes(lower as any)) {
      dbStatus = lower as RefundRequestStatus;
    }

    if (!dbStatus) {
      return { refs: [], mode: "NONE" };
    }

    const reqs = await this.refundRequestRepo.find({
      select: ["transactionReference"],
      where: { status: dbStatus },
    });
    const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
    return { refs, mode: "IN" };
  }

  private async attachRefundStatus(
    data: EligibleRecord[],
  ): Promise<EligibleRecord[]> {
    if (data.length === 0) return data;
    const refs = data.map((r) => r.transactionReference).filter(Boolean);
    if (refs.length === 0) return data;

    const existingRequests = await this.refundRequestRepo.find({
      select: [
        "transactionReference",
        "status",
        "id",
        "requestedBy",
        "reviewedBy",
        "approvedBy",
        "refundGatewayResponse",
        "requestReason",
        "overrideJustification",
        "reviewComment",
      ],
      where: { transactionReference: In(refs) },
    });

    const requestMap = new Map<string, RefundRequest>();
    for (const req of existingRequests) {
      if (req.transactionReference) {
        requestMap.set(req.transactionReference, req);
      }
    }

    return data.map((record) => {
      const match = requestMap.get(record.transactionReference);
      return {
        ...record,
        refundRequestStatus: match?.status,
        refundRequestId: match?.id,
        refundPostedBy: match?.requestedBy,
        refundReviewedBy: match?.reviewedBy,
        refundApprovedBy: match?.approvedBy,
        refundApiResponse: match?.refundGatewayResponse
          ? JSON.stringify(match.refundGatewayResponse)
          : null,
        requestReason: match?.requestReason,
        overrideJustification: match?.overrideJustification,
        reviewComment: match?.reviewComment,
      };
    });
  }

  async getProcessedSubscriptions(
    filters: EligibleFilters,
    eraFilter?: number,
  ): Promise<PaginatedEligible> {
    const {
      dateFrom,
      dateTo,
      refundedAtFrom,
      refundedAtTo,
      paymentMethod,
      packageName,
      page,
      limit,
    } = filters;
    const offset = (page - 1) * limit;

    const queryBuilder = this.refundRequestRepo
      .createQueryBuilder("rr")
      .where("rr.status = :status", { status: RefundRequestStatus.REFUNDED });

    if (eraFilter) {
      queryBuilder.andWhere("rr.era = :era", { era: eraFilter });
    }

    if (dateFrom) {
      queryBuilder.andWhere("rr.createdAt >= :dateFrom", {
        dateFrom: `${dateFrom} 00:00:00`,
      });
    }
    if (dateTo) {
      queryBuilder.andWhere("rr.createdAt <= :dateTo", {
        dateTo: `${dateTo} 23:59:59`,
      });
    }

    if (refundedAtFrom) {
      queryBuilder.andWhere("rr.refundProcessedAt >= :refundedAtFrom", {
        refundedAtFrom: `${refundedAtFrom} 00:00:00`,
      });
    }
    if (refundedAtTo) {
      queryBuilder.andWhere("rr.refundProcessedAt <= :refundedAtTo", {
        refundedAtTo: `${refundedAtTo} 23:59:59`,
      });
    }

    if (paymentMethod && paymentMethod !== "ALL") {
      const methods = paymentMethod.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
      if (methods.length > 0) {
        const subConds: string[] = [];
        const queryParams: Record<string, string> = {};
        methods.forEach((m, idx) => {
          if (m === "DUAL") {
            subConds.push(`rr.paymentMode = :mode_${idx}`);
            queryParams[`mode_${idx}`] = 'dual';
          } else {
            subConds.push(`rr.paymentMethod LIKE :pm_${idx}`);
            if (m === "EASYPAISA") queryParams[`pm_${idx}`] = '%Easy_Paisa%';
            else if (m === "JAZZCASH") queryParams[`pm_${idx}`] = '%Jazz_Cash%';
            else if (m === "CARD") queryParams[`pm_${idx}`] = '%Card%';
            else if (m === "JAZZ_BALANCE" || m === "JAZZBALANCE") queryParams[`pm_${idx}`] = '%Jazz_Balance%';
            else queryParams[`pm_${idx}`] = `%${m}%`;
          }
        });
        if (subConds.length > 0) {
          queryBuilder.andWhere(`(${subConds.join(' OR ')})`, queryParams);
        }
      }
    }

    if (packageName && packageName !== "ALL") {
      queryBuilder.andWhere("rr.packageName LIKE :packageName", {
        packageName: `%${packageName}%`,
      });
    }

    queryBuilder.orderBy("rr.createdAt", "DESC").skip(offset).take(limit);

    const [requests, total] = await queryBuilder.getManyAndCount();

    const data: EligibleRecord[] = requests.map((rr) => ({
      era: rr.era as 2 | 3,
      subscriptionType: rr.era === 2 ? "Old Subscription" : "New Subscription",
      transactionReference: rr.transactionReference,
      orderId: rr.orderId || "",
      paymentOrderId: rr.paymentOrderId || undefined,
      paymentMethod: rr.paymentMethod,
      paymentMode: rr.paymentMode,
      serviceCode: rr.packageName,
      mobileNumber: rr.mobileNumber || rr.msisdn,
      walletNumber: rr.walletNumber,
      amountDeducted: Number(rr.amountDeducted),
      loanAmount: Number(rr.loanAmount),
      userAmount: Number(rr.userAmount),
      actualRefundAmount: Number(rr.requestedRefundAmount),
      isPartialRefund: rr.isPartialRefund,
      paymentStatus: rr.paymentStatus || "",
      fulfillmentStatus: rr.fulfillmentStatus || "",
      errorMessage: rr.errorMessage,
      timestamp: rr.createdAt.toISOString(),
      refundRequestStatus: rr.status,
      refundRequestId: rr.id,
      refundPostedBy: rr.requestedBy,
      refundReviewedBy: rr.reviewedBy,
      refundApprovedBy: rr.approvedBy,
      refundApiResponse: rr.refundGatewayResponse
        ? JSON.stringify(rr.refundGatewayResponse)
        : null,
      requestReason: rr.requestReason,
      overrideJustification: rr.overrideJustification,
      reviewComment: rr.reviewComment,
    }));

    return { data, total, page, limit };
  }

  async getEligibleAllSubscriptions(
    filters: EligibleFilters,
    excludeSuccess = true,
  ): Promise<PaginatedEligible> {
    const { page, limit } = filters;

    // Fetch ALL matching records from both eras (set large limit, page 1 to get totals)
    const bigLimit = { ...filters, page: 1, limit: 10000 };
    const [oldResult, newResult] = await Promise.all([
      this.getEligibleOldSubscriptions(bigLimit, excludeSuccess),
      this.getEligibleNewSubscriptions(bigLimit, excludeSuccess),
    ]);

    // Merge and sort by timestamp descending
    const allRecords = [...oldResult.data, ...newResult.data].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const total = allRecords.length;
    const offset = (page - 1) * limit;
    const data = allRecords.slice(offset, offset + limit);

    return { data, total, page, limit };
  }
}
