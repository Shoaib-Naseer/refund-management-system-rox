import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere, In, DataSource } from "typeorm";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import {
  RefundRequest,
  RefundRequestStatus,
} from "../../entities/refund-request.entity";
import {
  RefundCase,
  RefundCaseStatus,
  RefundStatus,
} from "../../entities/refund-case.entity";
import { BulkOperation, BulkOperationStatus } from "../../entities/bulk-operation.entity";
import { UserRole } from "../../entities/user.entity";
import { RefundProcessingService } from "../refund-processing/refund-processing.service";
import { toSubscriberFormat } from "../verification/msisdn-utils";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateRefundRequestDto } from "./dto/create-refund-request.dto";
import { ReviewRefundRequestDto } from "./dto/review-refund-request.dto";
import { QueryRefundRequestsDto } from "./dto/query-refund-requests.dto";

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
  permissions: Set<string>;
}

/**
 * Payment method values differ in shape across eras (Era 3: "EASYPAISA"/"JAZZCASH"/"CARD",
 * Era 2: "Easy_Paisa"/"Jazz_Cash"/"Jazz_Balance") — normalize to what
 * RefundProcessingService.processRefund expects before invoking it.
 */
function normalizePaymentMethodForGateway(raw: string | null): string {
  const key = (raw || "").toUpperCase().replace(/_/g, "");
  if (key === "JAZZCASH") return "Jazz_Cash";
  if (key === "CARD") return "Card";
  return "Easy_Paisa";
}

const NON_RESUBMITTABLE_STATUSES = [
  RefundRequestStatus.SUBMITTED,
  RefundRequestStatus.UNDER_REVIEW,
  RefundRequestStatus.APPROVED,
  RefundRequestStatus.PROCESSING,
  RefundRequestStatus.REFUNDED,
];

@Injectable()
export class RefundRequestsService {
  private readonly logger = new Logger(RefundRequestsService.name);

  constructor(
    @InjectRepository(RefundRequest)
    private readonly refundRequestRepo: Repository<RefundRequest>,
    @InjectRepository(RefundCase)
    private readonly refundCaseRepo: Repository<RefundCase>,
    @InjectRepository(BulkOperation)
    private readonly bulkOperationRepo: Repository<BulkOperation>,
    private readonly refundProcessingService: RefundProcessingService,
    private readonly dataSource: DataSource,
    @InjectQueue('refund-queue')
    private readonly refundQueue: Queue,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resolves which RefundCase (if any) this request should be linked to.
   * An explicit refundCaseId always wins (but must reference a real case).
   * Otherwise, try to find one via the same orderId/paymentOrderId, then
   * fall back to the most recent case for this msisdn. Best-effort — null
   * is a valid outcome when nothing matches.
   */
  private async resolveRefundCaseId(
    dto: CreateRefundRequestDto,
    user: AuthenticatedUser,
  ): Promise<number> {
    if (dto.refundCaseId) {
      const explicitCase = await this.refundCaseRepo.findOne({
        where: { id: dto.refundCaseId },
      });
      if (!explicitCase) {
        throw new BadRequestException(
          `No RefundCase found with id ${dto.refundCaseId}.`,
        );
      }
      this.logger.log(
        `[RefundRequest] Linked to explicit refundCaseId ${dto.refundCaseId}`,
      );
      return explicitCase.id;
    }

    const hr = dto.historyRecord;
    const candidateOrderIds = [hr.orderId, hr.paymentOrderId].filter(Boolean);
    if (candidateOrderIds.length > 0) {
      const byOrderId = await this.refundCaseRepo.findOne({
        where: candidateOrderIds.map((orderId) => ({ orderId })),
        order: { createdAt: "DESC" },
      });
      if (byOrderId) {
        this.logger.log(
          `[RefundRequest] Auto-linked to RefundCase #${byOrderId.id} via matching orderId`,
        );
        return byOrderId.id;
      }
    }

    const normalizedMsisdn = toSubscriberFormat(dto.msisdn);
    const byMsisdn = await this.refundCaseRepo.findOne({
      where: { msisdn: normalizedMsisdn },
      order: { createdAt: "DESC" },
    });
    if (byMsisdn) {
      this.logger.log(
        `[RefundRequest] No orderId match — auto-linked to most recent RefundCase #${byMsisdn.id} for MSISDN ${normalizedMsisdn}`,
      );
      return byMsisdn.id;
    }

    this.logger.log(
      `[RefundRequest] No RefundCase found to link for MSISDN ${normalizedMsisdn} — generating new case`,
    );

    let paymentMethodEnum: any = null;
    const pmUpper = String(hr.paymentMethod || "")
      .toUpperCase()
      .replace(/_/g, "");
    if (pmUpper === "EASYPAISA") paymentMethodEnum = "Easy_Paisa";
    else if (pmUpper === "JAZZCASH") paymentMethodEnum = "Jazz_Cash";
    else if (pmUpper === "CARD" || pmUpper === "MCBCARD")
      paymentMethodEnum = "Card";

    const newCase = this.refundCaseRepo.create({
      caseNumber: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      msisdn: normalizedMsisdn,
      amount: dto.requestedRefundAmount || Number(hr.amountDeducted) || 0,
      paymentMethod: paymentMethodEnum,
      accountNumber: hr.walletNumber || null,
      packageCode: hr.packageName || null,
      orderId:
        hr.orderId || hr.paymentOrderId || hr.transactionReference || null,
      transactionDatetime: hr.timestamp ? new Date(hr.timestamp) : new Date(),
      status: RefundCaseStatus.PENDING,
      refundStatus: RefundStatus.NOT_PROCESSED,
      sourceSnapshot: hr,
      createdBy: user.username,
    });

    const savedCase = await this.refundCaseRepo.save(newCase);
    this.logger.log(
      `[RefundRequest] Generated and linked new RefundCase #${savedCase.id}`,
    );
    return savedCase.id;
  }

  /**
   * Batched version of resolveRefundCaseId() for bulk inserts — resolves all
   * records' RefundCase links with a handful of IN(...) queries instead of
   * per-record round-trips. New cases (the "nothing matched" branch) are
   * still created individually since each needs its own generated id, but
   * that only happens for records with no existing case at all.
   * Returns a map of transactionReference -> resolved refundCaseId.
   */
  private async resolveRefundCaseIdsBatch(
    manager: import('typeorm').EntityManager,
    records: CreateRefundRequestDto[],
    user: AuthenticatedUser,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    const explicitIds = [...new Set(records.filter((r) => r.refundCaseId).map((r) => r.refundCaseId!))];
    const explicitCases = explicitIds.length
      ? await manager.find(RefundCase, { where: { id: In(explicitIds) } })
      : [];
    const caseById = new Map(explicitCases.map((c) => [c.id, c]));

    const remaining = records.filter((r) => !r.refundCaseId || !caseById.has(r.refundCaseId));
    for (const r of records) {
      const txnRef = r.historyRecord?.transactionReference;
      if (r.refundCaseId && caseById.has(r.refundCaseId) && txnRef) {
        result.set(txnRef, r.refundCaseId);
      } else if (r.refundCaseId && txnRef) {
        throw new BadRequestException(`No RefundCase found with id ${r.refundCaseId}.`);
      }
    }

    const orderIds = [
      ...new Set(
        remaining.flatMap((r) => [r.historyRecord?.orderId, r.historyRecord?.paymentOrderId]).filter(Boolean),
      ),
    ];
    const casesByOrderId = orderIds.length
      ? await manager.find(RefundCase, { where: { orderId: In(orderIds) }, order: { createdAt: 'DESC' } })
      : [];
    const bestCaseForOrderId = new Map<string, RefundCase>();
    for (const c of casesByOrderId) {
      if (c.orderId && !bestCaseForOrderId.has(c.orderId)) bestCaseForOrderId.set(c.orderId, c);
    }

    const stillRemaining: CreateRefundRequestDto[] = [];
    for (const r of remaining) {
      const txnRef = r.historyRecord?.transactionReference;
      const candidateOrderIds = [r.historyRecord?.orderId, r.historyRecord?.paymentOrderId].filter(Boolean);
      const match = candidateOrderIds.map((id) => bestCaseForOrderId.get(id)).find(Boolean);
      if (match && txnRef) {
        result.set(txnRef, match.id);
      } else {
        stillRemaining.push(r);
      }
    }

    const normalizedMsisdns = [
      ...new Set(stillRemaining.map((r) => toSubscriberFormat(r.msisdn)).filter(Boolean)),
    ];
    const casesByMsisdn = normalizedMsisdns.length
      ? await manager.find(RefundCase, { where: { msisdn: In(normalizedMsisdns) }, order: { createdAt: 'DESC' } })
      : [];
    const bestCaseForMsisdn = new Map<string, RefundCase>();
    for (const c of casesByMsisdn) {
      if (c.msisdn && !bestCaseForMsisdn.has(c.msisdn)) bestCaseForMsisdn.set(c.msisdn, c);
    }

    for (const r of stillRemaining) {
      const txnRef = r.historyRecord?.transactionReference;
      const normalizedMsisdn = toSubscriberFormat(r.msisdn);
      const match = bestCaseForMsisdn.get(normalizedMsisdn);
      if (match && txnRef) {
        result.set(txnRef, match.id);
        continue;
      }

      // No existing case anywhere — generate a new one (needs its own round-trip for the id).
      const hr = r.historyRecord;
      let paymentMethodEnum: any = null;
      const pmUpper = String(hr.paymentMethod || '').toUpperCase().replace(/_/g, '');
      if (pmUpper === 'EASYPAISA') paymentMethodEnum = 'Easy_Paisa';
      else if (pmUpper === 'JAZZCASH') paymentMethodEnum = 'Jazz_Cash';
      else if (pmUpper === 'CARD' || pmUpper === 'MCBCARD') paymentMethodEnum = 'Card';

      const newCase = manager.create(RefundCase, {
        caseNumber: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        msisdn: normalizedMsisdn,
        amount: r.requestedRefundAmount || Number(hr.amountDeducted) || 0,
        paymentMethod: paymentMethodEnum,
        accountNumber: hr.walletNumber || null,
        packageCode: hr.packageName || null,
        orderId: hr.orderId || hr.paymentOrderId || hr.transactionReference || null,
        transactionDatetime: hr.timestamp ? new Date(hr.timestamp) : new Date(),
        status: RefundCaseStatus.PENDING,
        refundStatus: RefundStatus.NOT_PROCESSED,
        sourceSnapshot: hr,
        createdBy: user.username,
      });
      const savedCase = await manager.save(RefundCase, newCase);
      if (txnRef) result.set(txnRef, savedCase.id);
      // Newly created case is also the best match for any later record with the same msisdn.
      bestCaseForMsisdn.set(normalizedMsisdn, savedCase);
    }

    return result;
  }

  async create(
    dto: CreateRefundRequestDto,
    user: AuthenticatedUser,
  ): Promise<RefundRequest> {
    const hr = dto.historyRecord;

    if (
      hr.era == null ||
      !hr.transactionReference ||
      hr.amountDeducted == null
    ) {
      throw new BadRequestException(
        "historyRecord must include at least era, transactionReference, and amountDeducted (pass through the row from GET /api/history/:msisdn as-is)",
      );
    }

    const duplicate = await this.refundRequestRepo.findOne({
      where: {
        transactionReference: hr.transactionReference,
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `A refund request already exists for this transaction (request #${duplicate.id}, status: ${duplicate.status}).`,
      );
    }

    const isEligible = hr.refundEligibility === "Eligible";
    let requiresOverrideApproval = false;

    if (!isEligible) {
      if (!dto.isOverride) {
        throw new BadRequestException(
          `This transaction is not eligible for refund (refundEligibility=${hr.refundEligibility ?? "unknown"}, packagePosted=${hr.packagePosted ?? "unknown"}). ` +
            `If this is a valid exception (e.g. a testing case), resubmit with isOverride=true and an overrideJustification.`,
        );
      }
      if (!dto.overrideJustification || !dto.overrideJustification.trim()) {
        throw new BadRequestException(
          "overrideJustification is required when isOverride is true.",
        );
      }
      requiresOverrideApproval = true;
    }

    // Recompute the refundable amount server-side rather than trusting the client outright.
    const loanAmount = Number(hr.loanAmount ?? 0);
    const amountDeducted = Number(hr.amountDeducted);
    const serverComputedAmount = Math.max(amountDeducted - loanAmount, 0);
    const claimedAmount =
      dto.requestedRefundAmount ??
      hr.actualRefundAmount ??
      hr.userAmount ??
      serverComputedAmount;

    let requestedRefundAmount = serverComputedAmount;
    if (Math.abs(Number(claimedAmount) - serverComputedAmount) > 0.01) {
      this.logger.warn(
        `[RefundRequest] Client-submitted refund amount (${claimedAmount}) differs from server-computed amount (${serverComputedAmount}) for era ${hr.era}/${hr.transactionReference} — using server-computed value.`,
      );
    }

    const refundCaseId = await this.resolveRefundCaseId(dto, user);

    const refundRequest = this.refundRequestRepo.create({
      msisdn: dto.msisdn,
      refundCaseId,
      era: hr.era,
      tableName: hr.tableName,
      transactionReference: hr.transactionReference,
      orderId: hr.orderId || null,
      paymentOrderId: hr.paymentOrderId || null,
      legacyTransactionId: hr.tid || null,
      paymentMethod: hr.paymentMethod || null,
      packageName: hr.packageName || null,
      amountDeducted,
      loanAmount,
      userAmount:
        hr.userAmount != null ? Number(hr.userAmount) : serverComputedAmount,
      isPartialRefund: !!hr.isPartialRefund,
      requestedRefundAmount,
      paymentStatus: hr.paymentStatus || null,
      packagePosted: hr.packagePosted || null,
      fulfillmentStatus: hr.fulfillmentStatus || null,
      errorMessage: hr.errorMessage || null,
      fulfillmentMessage: hr.fulfillmentMessage || null,
      refundEligibility: hr.refundEligibility || null,
      sourceTimestamp: hr.timestamp ? new Date(hr.timestamp) : null,
      mobileNumber: hr.mobileNumber || null,
      walletNumber: hr.walletNumber || null,
      inquirySnapshot: hr.inquiry || null,
      requestReason: dto.requestReason || null,
      isOverride: !!dto.isOverride,
      overrideJustification: dto.overrideJustification || null,
      requiresOverrideApproval,
      status: RefundRequestStatus.SUBMITTED,
      requestedByUserId: user.id,
      requestedBy: user.username,
    });

    await this.refundRequestRepo.save(refundRequest);
    this.logger.log(
      `[RefundRequest] Created #${refundRequest.id} for MSISDN ${dto.msisdn} (era ${hr.era}, ref ${hr.transactionReference}) by ${user.username}`,
    );

    this.notificationsService.notify(
      dto.msisdn,
      "Refund Request Received",
      `We've received your refund request for Rs. ${requestedRefundAmount.toLocaleString()} and it's under review.`,
      "INFO",
      { requestId: String(refundRequest.id), amount: String(requestedRefundAmount) },
    );

    return refundRequest;
  }

  async findAll(query: QueryRefundRequestsDto, currentUser?: AuthenticatedUser): Promise<{
    data: RefundRequest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<RefundRequest> = {};
    if (query.status) where.status = query.status as RefundRequestStatus;
    if (query.msisdn) where.msisdn = query.msisdn;

    // Scope-based filtering
    const scope = query.scope || 'all';
    if (scope === 'all') {
      if (!currentUser || !currentUser.permissions.has('refund_requests.read_all')) {
        throw new ForbiddenException('Only administrators can access the full refund requests queue');
      }
    } else if (scope === 'pending') {
      if (!currentUser || !currentUser.permissions.has('refund_requests.review')) {
        throw new ForbiddenException('Only reviewers and administrators can access the pending review queue');
      }
      // Show only actionable items for reviewers
      if (!query.status) {
        where.status = In([
          RefundRequestStatus.SUBMITTED,
          RefundRequestStatus.UNDER_REVIEW,
          RefundRequestStatus.FAILED,
        ]) as any;
      }
    } else if (scope === 'mine' && currentUser) {
      where.requestedByUserId = currentUser.id;
    }

    if (query.inquiryConfirmedPaid === 'true') {
      // Payment looked failed on the source system, but a gateway inquiry
      // (see resolvePaidStatus in history.service.ts) confirmed it was
      // actually paid — inquirySnapshot.status carries that verdict.
      const qb = this.refundRequestRepo
        .createQueryBuilder('r')
        .where(where)
        .andWhere("LOWER(r.paymentStatus) NOT IN ('success', 'completed', 'paid', 'verified')")
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(r.inquirySnapshot, '$.status')) LIKE '%Confirmed Paid%'")
        .orderBy('r.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page, limit };
    }

    const [data, total] = await this.refundRequestRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<RefundRequest> {
    const refundRequest = await this.refundRequestRepo.findOne({
      where: { id },
      relations: ["requestedByUser", "reviewedByUser", "approvedByUser"],
    });
    if (!refundRequest) {
      throw new NotFoundException(`Refund request with ID ${id} not found`);
    }
    return refundRequest;
  }

  async review(
    id: number,
    dto: ReviewRefundRequestDto,
    user: AuthenticatedUser,
  ): Promise<{ requestId: number; status: string; queued: boolean }> {
    const refundRequest = await this.refundRequestRepo.findOne({ where: { id } });
    if (!refundRequest) {
      throw new NotFoundException(`Refund request with ID ${id} not found`);
    }

    const isRetry =
      refundRequest.status === RefundRequestStatus.FAILED &&
      dto.decision === "approve";

    if (
      !isRetry &&
      refundRequest.status !== RefundRequestStatus.SUBMITTED &&
      refundRequest.status !== RefundRequestStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Refund request #${id} is already in status "${refundRequest.status}" and cannot be reviewed again.`,
      );
    }

    if (refundRequest.requiresOverrideApproval && !user.permissions.has('refund_requests.override_approve')) {
      throw new ForbiddenException(
        "This request required an override — only an admin can review it.",
      );
    }

    refundRequest.reviewedByUserId = user.id;
    refundRequest.reviewedBy = user.username;
    refundRequest.reviewedAt = new Date();
    refundRequest.reviewComment = dto.comment || null;

    if (dto.decision === "reject") {
      refundRequest.status = RefundRequestStatus.REJECTED;
      await this.refundRequestRepo.save(refundRequest);
      this.logger.log(`[RefundRequest] #${id} rejected by ${user.username}`);
      this.notificationsService.notify(
        refundRequest.msisdn,
        "Refund Request Rejected",
        `Your refund request${dto.comment ? ` was rejected: ${dto.comment}` : " has been rejected."}`,
        "WARNING",
        { requestId: String(id) },
      );
      return { requestId: id, status: RefundRequestStatus.REJECTED, queued: false };
    }

    // Mark as approved + processing — push to queue
    refundRequest.approvedByUserId = user.id;
    refundRequest.approvedBy = user.username;
    refundRequest.approvedAt = new Date();
    refundRequest.status = RefundRequestStatus.PROCESSING;
    await this.refundRequestRepo.save(refundRequest);

    // Push a single job to the background queue (no bulkOperationId for single approvals)
    await this.refundQueue.add(
      'process-single-refund',
      { requestId: id, bulkOperationId: null },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    this.logger.log(
      `[RefundRequest] #${id} approved by ${user.username} — queued for background processing`,
    );
    return { requestId: id, status: RefundRequestStatus.PROCESSING, queued: true };
  }

  /**
   * Bulk review (approve/reject) multiple existing refund requests.
   * For approvals: creates a parent BulkOperation, links all requests to it,
   * and enqueues one job per request for background processing.
   */
  async bulkReview(
    ids: number[],
    decision: 'approve' | 'reject',
    comment: string | undefined,
    user: AuthenticatedUser,
  ): Promise<{ bulkOperationId: number | null; total: number; queued: number; rejected: number }> {
    if (decision === 'reject') {
      // Rejections are instant — no gateway call needed
      const targets = await this.refundRequestRepo.find({
        where: { id: In(ids) },
        select: { id: true, msisdn: true },
      });

      await this.refundRequestRepo
        .createQueryBuilder()
        .update(RefundRequest)
        .set({
          status: RefundRequestStatus.REJECTED,
          reviewedByUserId: user.id,
          reviewedBy: user.username,
          reviewedAt: new Date(),
          reviewComment: comment || null,
        })
        .whereInIds(ids)
        .execute();

      this.logger.log(`[BulkReview] ${ids.length} requests rejected by ${user.username}`);

      for (const target of targets) {
        this.notificationsService.notify(
          target.msisdn,
          "Refund Request Rejected",
          `Your refund request${comment ? ` was rejected: ${comment}` : " has been rejected."}`,
          "WARNING",
          { requestId: String(target.id) },
        );
      }

      return { bulkOperationId: null, total: ids.length, queued: 0, rejected: ids.length };
    }

    // ── APPROVAL PATH ─────────────────────────────────────────────────────────
    // Step 1: Create parent BulkOperation + link all requests inside a DB transaction
    const bulkOperation = await this.dataSource.transaction(async (manager) => {
      const bulkOp = manager.create(BulkOperation, {
        operationNumber: `BULK-${Date.now()}`,
        totalCases: ids.length,
        processedCases: 0,
        successfulRefunds: 0,
        failedRefunds: 0,
        status: BulkOperationStatus.PROCESSING,
        createdBy: user.username,
      });
      const savedBulkOp = await manager.save(BulkOperation, bulkOp);

      // Link all selected refund_requests to the parent batch and mark as PROCESSING
      await manager
        .createQueryBuilder()
        .update(RefundRequest)
        .set({
          status: RefundRequestStatus.PROCESSING,
          bulkOperationId: savedBulkOp.id,
          approvedByUserId: user.id,
          approvedBy: user.username,
          approvedAt: new Date(),
          reviewedByUserId: user.id,
          reviewedBy: user.username,
          reviewedAt: new Date(),
          reviewComment: comment || null,
        })
        .whereInIds(ids)
        .execute();

      return savedBulkOp;
    });

    // Step 2: Fan-out — push one job per request into the queue
    const jobs = ids.map((requestId) => ({
      name: 'process-single-refund',
      data: { requestId, bulkOperationId: bulkOperation.id },
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    }));
    await this.refundQueue.addBulk(jobs);

    this.logger.log(
      `[BulkReview] Bulk operation #${bulkOperation.id} created — ${ids.length} jobs queued by ${user.username}`,
    );
    return {
      bulkOperationId: bulkOperation.id,
      total: ids.length,
      queued: ids.length,
      rejected: 0,
    };
  }

  /**
   * Bulk create refund requests from system-detected eligible records,
   * wrap in a DB transaction, link to a BulkOperation, then fan-out to queue.
   *
   * Unlike `create()`, this validates every record's schema up front and
   * inserts all resulting rows in a single multi-row INSERT rather than one
   * round-trip per record — a per-record sequential loop here was slow
   * enough (N * several DB round-trips) to trip the dev-proxy timeout on
   * large batches.
   */
  async bulkCreateAndRefund(
    records: CreateRefundRequestDto[],
    user: AuthenticatedUser,
    autoApprove: boolean,
  ): Promise<{ bulkOperationId: number | null; total: number; created: number; queued: number; errors: string[] }> {
    const errors: string[] = [];

    // Step 1: Verify each record's payload shape/business rules before touching the DB.
    const valid: { record: CreateRefundRequestDto; txnRef: string }[] = [];
    const seenRefs = new Set<string>();
    for (const record of records) {
      const hr = record.historyRecord;
      const txnRef = hr?.transactionReference || 'unknown';
      if (hr?.era == null || !hr?.transactionReference || hr?.amountDeducted == null) {
        errors.push(
          `${txnRef}: historyRecord must include at least era, transactionReference, and amountDeducted`,
        );
        continue;
      }
      if (hr.refundEligibility !== 'Eligible') {
        if (!record.isOverride) {
          errors.push(
            `${txnRef}: not eligible for refund (refundEligibility=${hr.refundEligibility ?? 'unknown'}) — resubmit with isOverride=true`,
          );
          continue;
        }
        if (!record.overrideJustification || !record.overrideJustification.trim()) {
          errors.push(`${txnRef}: overrideJustification is required when isOverride is true`);
          continue;
        }
      }
      if (seenRefs.has(txnRef)) {
        errors.push(`${txnRef}: duplicate transactionReference within this batch`);
        continue;
      }
      seenRefs.add(txnRef);
      valid.push({ record, txnRef });
    }

    const createdIds: number[] = [];

    if (valid.length > 0) {
      // Step 2: Build and insert all rows in a single transaction/round-trip.
      await this.dataSource.transaction(async (manager) => {
        // Batch duplicate check against existing rows (one query instead of one per record).
        const existing = await manager.find(RefundRequest, {
          where: { transactionReference: In(valid.map((v) => v.txnRef)) },
          select: { transactionReference: true },
        });
        const existingRefs = new Set(existing.map((r) => r.transactionReference));

        // Batch resolve refund-case links (explicit ids, orderId matches, msisdn fallback).
        const caseIdByTxnRef = await this.resolveRefundCaseIdsBatch(
          manager,
          valid.map((v) => v.record),
          user,
        );

        const entities: Partial<RefundRequest>[] = [];
        for (const { record, txnRef } of valid) {
          if (existingRefs.has(txnRef)) {
            errors.push(`${txnRef}: a refund request already exists for this transaction`);
            continue;
          }
          const hr = record.historyRecord;
          const isEligible = hr.refundEligibility === 'Eligible';
          const loanAmount = Number(hr.loanAmount ?? 0);
          const amountDeducted = Number(hr.amountDeducted);
          const requestedRefundAmount = Math.max(amountDeducted - loanAmount, 0);

          entities.push({
            msisdn: record.msisdn,
            refundCaseId: caseIdByTxnRef.get(txnRef) ?? null,
            era: hr.era,
            tableName: hr.tableName,
            transactionReference: hr.transactionReference,
            orderId: hr.orderId || null,
            paymentOrderId: hr.paymentOrderId || null,
      legacyTransactionId: hr.tid || null,
            paymentMethod: hr.paymentMethod || null,
            packageName: hr.packageName || null,
            amountDeducted,
            loanAmount,
            userAmount: hr.userAmount != null ? Number(hr.userAmount) : requestedRefundAmount,
            isPartialRefund: !!hr.isPartialRefund,
            requestedRefundAmount,
            paymentStatus: hr.paymentStatus || null,
            packagePosted: hr.packagePosted || null,
            fulfillmentStatus: hr.fulfillmentStatus || null,
            errorMessage: hr.errorMessage || null,
            fulfillmentMessage: hr.fulfillmentMessage || null,
            refundEligibility: hr.refundEligibility || null,
            sourceTimestamp: hr.timestamp ? new Date(hr.timestamp) : null,
            mobileNumber: hr.mobileNumber || null,
            walletNumber: hr.walletNumber || null,
            inquirySnapshot: hr.inquiry || null,
            requestReason: record.requestReason || null,
            isOverride: !!record.isOverride,
            overrideJustification: record.overrideJustification || null,
            requiresOverrideApproval: !isEligible,
            status: RefundRequestStatus.SUBMITTED,
            requestedByUserId: user.id,
            requestedBy: user.username,
          });
        }

        if (entities.length > 0) {
          const insertResult = await manager.insert(RefundRequest, entities);
          for (const row of insertResult.identifiers) {
            createdIds.push(row.id);
          }
          this.logger.log(
            `[BulkCreateAndRefund] Inserted ${entities.length} requests in a single round-trip for ${user.username}`,
          );

          // One "request received" notification per customer, same as the single-create path.
          // TypeORM guarantees insertResult.identifiers is ordered the same as `entities`.
          entities.forEach((entity, i) => {
            const id = insertResult.identifiers[i]?.id;
            if (!entity.msisdn || !id) return;
            this.notificationsService.notify(
              entity.msisdn,
              "Refund Request Received",
              `We've received your refund request for Rs. ${Number(entity.requestedRefundAmount).toLocaleString()} and it's under review.`,
              "INFO",
              { requestId: String(id), amount: String(entity.requestedRefundAmount) },
            );
          });
        }
      });
    }

    if (createdIds.length === 0 || !autoApprove) {
      this.logger.log(
        `[BulkCreateAndRefund] ${createdIds.length} requests created (not queued — autoApprove=${autoApprove})`,
      );
      return { bulkOperationId: null, total: records.length, created: createdIds.length, queued: 0, errors };
    }

    // Step 2: If autoApprove, delegate to bulkReview which handles BulkOperation creation + queueing
    const bulkResult = await this.bulkReview(createdIds, 'approve', 'Bulk auto-approved', user);
    this.logger.log(
      `[BulkCreateAndRefund] ${createdIds.length} created, ${bulkResult.queued} queued for refund by ${user.username}`,
    );

    return {
      bulkOperationId: bulkResult.bulkOperationId,
      total: records.length,
      created: createdIds.length,
      queued: bulkResult.queued,
      errors,
    };
  }
}
