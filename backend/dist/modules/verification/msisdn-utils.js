"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSubscriberFormat = toSubscriberFormat;
exports.toPayerFormat = toPayerFormat;
exports.buildMsisdnVariants = buildMsisdnVariants;
function toSubscriberFormat(msisdn) {
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
function toPayerFormat(msisdn) {
    const subscriber = toSubscriberFormat(msisdn);
    if (subscriber.startsWith('92') && subscriber.length >= 12) {
        return `0${subscriber.slice(2)}`;
    }
    return subscriber;
}
function buildMsisdnVariants(msisdn) {
    const sub = toSubscriberFormat(msisdn);
    if (!sub || sub.length < 12) {
        return [msisdn];
    }
    const payer = `0${sub.slice(2)}`;
    const raw = sub.slice(2);
    return [...new Set([sub, payer, raw])];
}
//# sourceMappingURL=msisdn-utils.js.map