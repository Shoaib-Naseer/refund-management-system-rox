/**
 * Utilities for normalizing MSISDNs to various database-specific formats.
 * Ported from scripts/refund-tools/complaint-verification/msisdn-utils.ts
 */

/**
 * Normalizes MSISDN to 923xxxxxxxxx format (used for subscribers)
 */
export function toSubscriberFormat(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, '');

  if (digits.startsWith('92')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `92${digits.slice(1)}`;
  }

  if (digits.startsWith('3')) {
    return digits.length === 9 ? `923${digits}` : `92${digits}`;
  }

  return digits;
}

/**
 * Normalizes MSISDN to 03xxxxxxxxx format (used for paying wallets)
 */
export function toPayerFormat(msisdn: string): string {
  const subscriber = toSubscriberFormat(msisdn);
  if (subscriber.startsWith('92') && subscriber.length >= 12) {
    return `0${subscriber.slice(2)}`;
  }
  return subscriber;
}

/**
 * Generates variants (e.g. ['923xxxxxxxxx', '03xxxxxxxxx', '3xxxxxxxxx'])
 * to search in tables that store numbers inconsistently
 */
export function buildMsisdnVariants(msisdn: string): string[] {
  const sub = toSubscriberFormat(msisdn);
  if (!sub || sub.length < 12) {
    return [msisdn];
  }
  const payer = `0${sub.slice(2)}`;
  const raw = sub.slice(2); // e.g. 3xxxxxxxxx
  return [...new Set([sub, payer, raw])];
}
