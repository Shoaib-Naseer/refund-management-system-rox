import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { RefundRequest, RefundRequestStatus } from '../src/entities/refund-request.entity';
import { inquireEasypaisa, inquireJazzCash } from '../src/modules/verification/inquiry-service';

/**
 * Reconciles the review queue (submitted / under_review / failed requests)
 * against live gateway inquiries. Some requests get stuck in the queue even
 * though the gateway already reversed/refunded the underlying payment —
 * this finds those and (with --apply) marks them REFUNDED using the same
 * fields the normal queue worker writes (see refund.processor.ts).
 *
 * Usage:
 *   npx ts-node scripts/reconcile-review-queue.ts                          # dry run — report only
 *   npx ts-node scripts/reconcile-review-queue.ts --apply                  # write updates to DB
 *   npx ts-node scripts/reconcile-review-queue.ts --jazzcash-only          # skip EasyPaisa/Card requests
 *   npx ts-node scripts/reconcile-review-queue.ts --jazzcash-only --apply
 */

const APPLY = process.argv.includes('--apply');
const JAZZCASH_ONLY = process.argv.includes('--jazzcash-only');
const INQUIRY_DELAY_MS = 300; // be polite to the gateway between calls

// Card refunds are executed via a JazzCash-hosted card API (see
// refundViaJazzCashCard in refund-processing.service.ts) and use the same
// pp_TxnRefNo / pp_* response shape, so Card requests inquire through the
// JazzCash endpoint too — there's no separate card inquiry API.
function normalizeGatewayMethod(raw: string | null): 'Jazz_Cash' | 'Easy_Paisa' | 'Unknown' {
  const key = (raw || '').toUpperCase().replace(/_/g, '');
  if (key === 'JAZZCASH' || key === 'CARD' || key === 'MCBCARD') return 'Jazz_Cash';
  if (key === 'EASYPAISA') return 'Easy_Paisa';
  return 'Unknown';
}

function classifyJazzCash(body: Record<string, any>): { confirmedRefunded: boolean; summary: string } {
  const hasApiSuccess = String(body.pp_ResponseCode || '') === '000';
  const isPaidInquiry =
    body.pp_Status === 'Completed' ||
    body.pp_PaymentResponseCode === '000' ||
    body.pp_PaymentResponseCode === '121';
  const isFullyReversed = /REFUND|REVERS/.test(String(body.pp_Status || '').toUpperCase());
  const confirmedRefunded = hasApiSuccess && isPaidInquiry && isFullyReversed;
  return {
    confirmedRefunded,
    summary: `pp_Status=${body.pp_Status} pp_ResponseCode=${body.pp_ResponseCode} pp_PaymentResponseCode=${body.pp_PaymentResponseCode}`,
  };
}

function classifyEasypaisa(body: Record<string, any>): { confirmedRefunded: boolean; summary: string } {
  const responseCode = String(body.responseCode || '');
  const responseDesc = String(body.responseDesc || body.message || '').toUpperCase();
  const transactionStatus = String(body.transactionStatus || '').toUpperCase();
  const transactionAmount = body.transactionAmount ? Number(body.transactionAmount) : null;
  const reversalAmount = body.reversalAmount ? Number(body.reversalAmount) : null;

  const hasApiSuccess = responseCode === '0000' && responseDesc === 'SUCCESS';
  const isPaidInquiry = transactionStatus === 'PAID';
  const isFullyReversed =
    transactionAmount !== null && reversalAmount !== null && Math.abs(transactionAmount - reversalAmount) < 0.01;
  const confirmedRefunded = hasApiSuccess && isPaidInquiry && isFullyReversed;
  return {
    confirmedRefunded,
    summary: `transactionStatus=${transactionStatus} responseCode=${responseCode} transactionAmount=${transactionAmount} reversalAmount=${reversalAmount}`,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
    synchronize: false,
    charset: 'utf8mb4',
    timezone: '+05:00',
  });
  await ds.initialize();
  console.log(
    `Connected to ${process.env.DB_DATABASE}@${process.env.DB_HOST}. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${JAZZCASH_ONLY ? ' (JazzCash only)' : ''}`,
  );

  const repo = ds.getRepository(RefundRequest);
  const queue = await repo.find({
    where: [
      { status: RefundRequestStatus.SUBMITTED },
      { status: RefundRequestStatus.UNDER_REVIEW },
      { status: RefundRequestStatus.FAILED },
    ],
    order: { createdAt: 'ASC' },
  });

  console.log(`Found ${queue.length} request(s) in the review queue.\n`);

  const toUpdate: RefundRequest[] = [];
  let skippedNoInquiry = 0;
  let inquiryErrors = 0;
  let notYetRefunded = 0;

  for (const req of queue) {
    const ref = req.transactionReference || req.paymentOrderId || req.orderId;
    const gatewayMethod = normalizeGatewayMethod(req.paymentMethod);

    if (!ref || gatewayMethod === 'Unknown') {
      skippedNoInquiry++;
      console.log(
        `#${req.id} [${ref || 'no-ref'}] — skipped (paymentMethod="${req.paymentMethod}", no inquiry API available)`,
      );
      continue;
    }

    if (JAZZCASH_ONLY && gatewayMethod !== 'Jazz_Cash') {
      skippedNoInquiry++;
      console.log(`#${req.id} [${ref}] — skipped (--jazzcash-only, paymentMethod="${req.paymentMethod}")`);
      continue;
    }

    try {
      let result: { confirmedRefunded: boolean; summary: string };
      let raw: Record<string, any>;

      if (gatewayMethod === 'Jazz_Cash') {
        raw = await inquireJazzCash(ref);
        result = classifyJazzCash(raw);
      } else {
        raw = await inquireEasypaisa(ref);
        result = classifyEasypaisa(raw);
      }

      if (result.confirmedRefunded) {
        console.log(`#${req.id} [${ref}] (${gatewayMethod}) — CONFIRMED REFUNDED at gateway. ${result.summary}`);
        req.status = RefundRequestStatus.REFUNDED;
        req.refundProcessedAt = new Date();
        req.refundGatewayResponse = raw;
        if (!req.reviewedBy) {
          req.reviewedByUserId = null;
          req.reviewedBy = 'SYSTEM-RECONCILE';
          req.reviewedAt = new Date();
          req.reviewComment = 'Reconciled via gateway inquiry — payment was already refunded at the gateway.';
        }
        if (!req.approvedBy) {
          req.approvedByUserId = null;
          req.approvedBy = 'SYSTEM-RECONCILE';
          req.approvedAt = new Date();
        }
        toUpdate.push(req);
      } else {
        notYetRefunded++;
        console.log(`#${req.id} [${ref}] (${gatewayMethod}) — not confirmed refunded. ${result.summary}`);
      }
    } catch (err: any) {
      inquiryErrors++;
      console.log(`#${req.id} [${ref}] (${gatewayMethod}) — inquiry failed: ${err.message}`);
    }

    await sleep(INQUIRY_DELAY_MS);
  }

  console.log('\n── Summary ──────────────────────────────────────────');
  console.log(`Total in queue:           ${queue.length}`);
  console.log(`Confirmed refunded:       ${toUpdate.length}`);
  console.log(`Not yet refunded:         ${notYetRefunded}`);
  console.log(`Inquiry errors:           ${inquiryErrors}`);
  console.log(`Skipped (no inquiry API): ${skippedNoInquiry}`);

  if (toUpdate.length > 0) {
    console.log(`\nRequests that ${APPLY ? 'WERE' : 'WOULD BE'} marked REFUNDED:`);
    for (const req of toUpdate) {
      console.log(`  #${req.id} — ${req.transactionReference} — Rs. ${req.requestedRefundAmount}`);
    }
  }

  if (APPLY && toUpdate.length > 0) {
    await repo.save(toUpdate);
    console.log(`\nApplied ${toUpdate.length} update(s) to the database.`);
  } else if (!APPLY && toUpdate.length > 0) {
    console.log('\nDry run — no changes written. Re-run with --apply to commit these updates.');
  }

  await ds.destroy();
}

main().catch((err) => {
  console.error('Reconciliation script failed:', err);
  process.exit(1);
});
