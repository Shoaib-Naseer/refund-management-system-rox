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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const refund_request_entity_1 = require("../../entities/refund-request.entity");
function calculateRefund(amountDeducted, metadataStr) {
    const deducted = typeof amountDeducted === "number"
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
    }
    catch {
        return {
            actualRefundAmount: deducted,
            isPartialRefund: false,
            loanAmount: 0,
            userAmount: deducted,
        };
    }
}
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    constructor(sourceDataSource, refundRequestRepo) {
        this.sourceDataSource = sourceDataSource;
        this.refundRequestRepo = refundRequestRepo;
        this.logger = new common_1.Logger(SubscriptionsService_1.name);
    }
    async getEligibleOldSubscriptions(filters, excludeSuccess = true) {
        const { dateFrom, dateTo, paymentMethod, packageName, refundStatus, page, limit, } = filters;
        const offset = (page - 1) * limit;
        const conditions = [
            `main.payment_status IN ('SUCCESS', 'PAID', 'VERIFIED', 'success', 'paid', 'verified')`,
            `(main.fulfillment_status NOT IN ('SUCCESS', 'RECHARGE_POSTED', 'success', 'recharge_posted') OR main.fulfillment_status IS NULL)`,
        ];
        const params = [];
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
            conditions.push(`main.payment_method LIKE ?`);
            params.push(`%${paymentMethod}%`);
        }
        if (packageName) {
            conditions.push(`(main.service_type LIKE ? OR main.service_code LIKE ?)`);
            params.push(`%${packageName}%`, `%${packageName}%`);
        }
        conditions.push(`main.created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`);
        const { refs, mode } = await this.getRefundRefsForFilter(refundStatus, excludeSuccess);
        if (mode === "IN" && refs.length === 0) {
            return { data: [], total: 0, page, limit };
        }
        if (mode === "IN") {
            conditions.push(`COALESCE(NULLIF(main.payment_gateway_ref, ''), main.transaction_id) IN (${refs.map(() => "?").join(",")})`);
            params.push(...refs);
        }
        else if (mode === "NOT_IN" && refs.length > 0) {
            conditions.push(`COALESCE(NULLIF(main.payment_gateway_ref, ''), main.transaction_id) NOT IN (${refs.map(() => "?").join(",")})`);
            params.push(...refs);
        }
        const where = conditions.join(" AND ");
        let total = 0;
        try {
            const countResult = await this.sourceDataSource.query(`SELECT COUNT(*) as cnt FROM \`rox_app\`.\`subscription_fulfillment_requests\` main WHERE ${where}`, params);
            total = Number(countResult[0]?.cnt ?? 0);
        }
        catch (e) {
            this.logger.error(`[OldSubscriptions] Count query error: ${e.message}`);
            return { data: [], total: 0, page, limit };
        }
        let rows;
        try {
            rows = await this.sourceDataSource.query(`
          SELECT
            main.transaction_id, main.mobile_number, main.service_type, main.service_code,
            main.fulfillment_price, main.payment_method, main.payment_status, main.payment_gateway_ref,
            main.amount_deducted, main.fulfillment_status, main.fulfillment_message,
            main.error_message, main.metadata, main.created_at
          FROM \`rox_app\`.\`subscription_fulfillment_requests\` main
          WHERE ${where}
          ORDER BY main.created_at DESC
          LIMIT ? OFFSET ?
        `, [...params, limit, offset]);
        }
        catch (e) {
            this.logger.error(`[OldSubscriptions] Data query error: ${e.message}`);
            return { data: [], total: 0, page, limit };
        }
        const walletMap = await this.batchFetchWallets(rows, "era2");
        const data = rows.map((row) => {
            const price = Number(row.amount_deducted || row.fulfillment_price || 0);
            const refund = calculateRefund(price, row.metadata);
            const pmUpper = String(row.payment_method || "")
                .toUpperCase()
                .replace(/_/g, "");
            const gatewayRef = row.payment_gateway_ref || "";
            return {
                era: 2,
                subscriptionType: "Old Subscription",
                transactionReference: gatewayRef || row.transaction_id,
                orderId: row.transaction_id,
                paymentMethod: row.payment_method || null,
                serviceCode: row.service_code || null,
                mobileNumber: row.mobile_number || "",
                walletNumber: walletMap.get(`${pmUpper}:${gatewayRef}`) ?? null,
                amountDeducted: price,
                loanAmount: refund.loanAmount,
                userAmount: refund.userAmount,
                actualRefundAmount: refund.actualRefundAmount,
                isPartialRefund: refund.isPartialRefund,
                paymentStatus: String(row.payment_status || "").toUpperCase(),
                fulfillmentStatus: String(row.fulfillment_status || row.fulfillment_message || "MISSING").toUpperCase(),
                errorMessage: row.error_message || null,
                fulfillmentMessage: row.fulfillment_message || null,
                timestamp: row.created_at ? new Date(row.created_at).toISOString() : "",
            };
        });
        const dataWithStatus = await this.attachRefundStatus(data);
        return { data: dataWithStatus, total, page, limit };
    }
    async getEligibleNewSubscriptions(filters, excludeSuccess = true) {
        const { dateFrom, dateTo, paymentMethod, packageName, refundStatus, page, limit, } = filters;
        const offset = (page - 1) * limit;
        const conditions = [
            `t.transaction_status IN ('COMPLETED', 'completed')`,
        ];
        const params = [];
        if (dateFrom) {
            conditions.push(`t.created_at >= ?`);
            params.push(`${dateFrom} 00:00:00`);
        }
        if (dateTo) {
            conditions.push(`t.created_at <= ?`);
            params.push(`${dateTo} 23:59:59`);
        }
        if (!dateFrom && !dateTo) {
            const pktTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
            const todayStr = pktTime.toISOString().split("T")[0];
            conditions.push(`t.created_at >= ?`);
            params.push(`${todayStr} 00:00:00`);
        }
        if (paymentMethod && paymentMethod !== "ALL") {
            conditions.push(`s.payment_key LIKE ?`);
            params.push(`%${paymentMethod}%`);
        }
        if (packageName) {
            conditions.push(`(sfr.bundle_code LIKE ?)`);
            params.push(`%${packageName}%`);
        }
        conditions.push(`t.created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`);
        const { refs, mode } = await this.getRefundRefsForFilter(refundStatus, excludeSuccess);
        if (mode === "IN" && refs.length === 0) {
            return { data: [], total: 0, page, limit };
        }
        if (mode === "IN") {
            conditions.push(`COALESCE(NULLIF(t.txn_reference, ''), t.payment_order_id) IN (${refs.map(() => "?").join(",")})`);
            params.push(...refs);
        }
        else if (mode === "NOT_IN" && refs.length > 0) {
            conditions.push(`COALESCE(NULLIF(t.txn_reference, ''), t.payment_order_id) NOT IN (${refs.map(() => "?").join(",")})`);
            params.push(...refs);
        }
        const where = conditions.join(" AND ");
        const mismatchCondition = `
      (LOWER(s.status) != 'active' OR sfr.fulfillment_status IS NULL OR LOWER(sfr.fulfillment_status) NOT IN ('success'))
    `;
        this.logger.log(`[NewSubscriptions] WHERE: ${where} AND ${mismatchCondition}`);
        this.logger.log(`[NewSubscriptions] params: ${JSON.stringify(params)}`);
        let total = 0;
        try {
            const countResult = await this.sourceDataSource.query(`
          SELECT COUNT(*) as cnt
          FROM \`fintech_subscription\`.\`subscriptions\` s
          INNER JOIN \`Fintech_payments\`.\`transactions\` t ON s.payment_order_id = t.payment_order_id
          LEFT JOIN \`fintech_subscription\`.\`subscription_fulfillment_requests\` sfr ON s.order_reference_id = sfr.order_reference_id
          WHERE ${where} AND ${mismatchCondition}
        `, params);
            total = Number(countResult[0]?.cnt ?? 0);
            this.logger.log(`[NewSubscriptions] Count result: ${total}`);
        }
        catch (e) {
            this.logger.error(`[NewSubscriptions] Count query error: ${e.message}`);
            return { data: [], total: 0, page, limit };
        }
        let rows;
        try {
            rows = await this.sourceDataSource.query(`
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
        `, [...params, limit, offset]);
            this.logger.log(`[NewSubscriptions] Rows returned: ${rows.length}`);
        }
        catch (e) {
            this.logger.error(`[NewSubscriptions] Data query error: ${e.message}`);
            return { data: [], total: 0, page, limit };
        }
        const data = rows.map((row) => {
            const dbAmount = Number(row.amount || 0);
            const loanAmount = Number(row.loan_charge_amount || 0);
            const userAmount = Math.max(dbAmount - loanAmount, 0);
            const isPartialRefund = loanAmount > 0;
            const paymentKey = String(row.sub_payment_key || "").toUpperCase();
            const subStatus = String(row.subscription_status || "MISSING").toUpperCase();
            const fulfillmentStatus = row.last_fulfillment_status
                ? String(row.last_fulfillment_status).toUpperCase()
                : "MISSING";
            const isEligible = subStatus !== "ACTIVE" && fulfillmentStatus !== "SUCCESS";
            return {
                era: 3,
                subscriptionType: "New Subscription",
                transactionReference: row.txn_reference || row.payment_order_id,
                orderId: row.order_reference_id,
                paymentOrderId: row.payment_order_id,
                paymentMethod: paymentKey || null,
                serviceCode: row.bundle_code || null,
                mobileNumber: row.sub_mobile_number || "",
                walletNumber: row.sub_wallet_number || row.account_no || null,
                amountDeducted: dbAmount,
                loanAmount,
                userAmount,
                actualRefundAmount: userAmount,
                isPartialRefund,
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
    async batchFetchWallets(rows, _era) {
        const walletMap = new Map();
        const epRefs = rows
            .filter((r) => String(r.payment_method || "")
            .toUpperCase()
            .replace(/_/g, "") === "EASYPAISA" && r.payment_gateway_ref)
            .map((r) => r.payment_gateway_ref);
        const jcRefs = rows
            .filter((r) => String(r.payment_method || "")
            .toUpperCase()
            .replace(/_/g, "") === "JAZZCASH" && r.payment_gateway_ref)
            .map((r) => r.payment_gateway_ref);
        if (epRefs.length > 0) {
            try {
                const epRows = await this.sourceDataSource.query(`SELECT orderId, mobileAccountNo FROM \`rox_easypaisa\`.\`easypaisa_transactions\` WHERE orderId IN (${epRefs.map(() => "?").join(",")})`, epRefs);
                for (const r of epRows) {
                    walletMap.set(`EASYPAISA:${r.orderId}`, r.mobileAccountNo || "");
                }
            }
            catch (e) {
                this.logger.warn(`[OldSubscriptions] EP wallet batch fetch failed: ${e.message}`);
            }
        }
        if (jcRefs.length > 0) {
            try {
                const jcRows = await this.sourceDataSource.query(`SELECT txnRefNo, walletAccountNumber FROM \`rox_jazz_payments\`.\`transaction\` WHERE txnRefNo IN (${jcRefs.map(() => "?").join(",")})`, jcRefs);
                for (const r of jcRows) {
                    walletMap.set(`JAZZCASH:${r.txnRefNo}`, r.walletAccountNumber || "");
                }
            }
            catch (e) {
                this.logger.warn(`[OldSubscriptions] JC wallet batch fetch failed: ${e.message}`);
            }
        }
        return walletMap;
    }
    async getRefundRefsForFilter(refundStatus, excludeSuccess = true) {
        if (refundStatus === "SUCCESS") {
            const reqs = await this.refundRequestRepo.find({
                select: ["transactionReference"],
                where: { status: refund_request_entity_1.RefundRequestStatus.REFUNDED },
            });
            const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
            return { refs, mode: "IN" };
        }
        if (!refundStatus || refundStatus === "ALL") {
            if (excludeSuccess) {
                const reqs = await this.refundRequestRepo.find({
                    select: ["transactionReference"],
                    where: { status: refund_request_entity_1.RefundRequestStatus.REFUNDED },
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
                    ? { status: (0, typeorm_1.Not)(refund_request_entity_1.RefundRequestStatus.REFUNDED) }
                    : undefined,
            });
            const refs = reqs.map((r) => r.transactionReference).filter(Boolean);
            return { refs, mode: "IN" };
        }
        let dbStatus;
        const lower = String(refundStatus).toLowerCase();
        if (lower === "pending") {
            dbStatus = refund_request_entity_1.RefundRequestStatus.UNDER_REVIEW;
        }
        else if (Object.values(refund_request_entity_1.RefundRequestStatus).includes(lower)) {
            dbStatus = lower;
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
    async attachRefundStatus(data) {
        if (data.length === 0)
            return data;
        const refs = data.map((r) => r.transactionReference).filter(Boolean);
        if (refs.length === 0)
            return data;
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
            where: { transactionReference: (0, typeorm_1.In)(refs) },
        });
        const requestMap = new Map();
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
    async getProcessedSubscriptions(filters, eraFilter) {
        const { dateFrom, dateTo, refundedAtFrom, refundedAtTo, paymentMethod, packageName, page, limit, } = filters;
        const offset = (page - 1) * limit;
        const queryBuilder = this.refundRequestRepo
            .createQueryBuilder("rr")
            .where("rr.status = :status", { status: refund_request_entity_1.RefundRequestStatus.REFUNDED });
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
            queryBuilder.andWhere("rr.paymentMethod LIKE :paymentMethod", {
                paymentMethod: `%${paymentMethod}%`,
            });
        }
        if (packageName && packageName !== "ALL") {
            queryBuilder.andWhere("rr.packageName LIKE :packageName", {
                packageName: `%${packageName}%`,
            });
        }
        queryBuilder.orderBy("rr.createdAt", "DESC").skip(offset).take(limit);
        const [requests, total] = await queryBuilder.getManyAndCount();
        const data = requests.map((rr) => ({
            era: rr.era,
            subscriptionType: rr.era === 2 ? "Old Subscription" : "New Subscription",
            transactionReference: rr.transactionReference,
            orderId: rr.orderId || "",
            paymentOrderId: rr.paymentOrderId || undefined,
            paymentMethod: rr.paymentMethod,
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
    async getEligibleAllSubscriptions(filters, excludeSuccess = true) {
        const { page, limit } = filters;
        const bigLimit = { ...filters, page: 1, limit: 10000 };
        const [oldResult, newResult] = await Promise.all([
            this.getEligibleOldSubscriptions(bigLimit, excludeSuccess),
            this.getEligibleNewSubscriptions(bigLimit, excludeSuccess),
        ]);
        const allRecords = [...oldResult.data, ...newResult.data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const total = allRecords.length;
        const offset = (page - 1) * limit;
        const data = allRecords.slice(offset, offset + limit);
        return { data, total, page, limit };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)("SOURCE_DATA_SOURCE")),
    __param(1, (0, typeorm_2.InjectRepository)(refund_request_entity_1.RefundRequest)),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        typeorm_1.Repository])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map