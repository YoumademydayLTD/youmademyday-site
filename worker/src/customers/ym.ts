// The internal customer number and the payment email derived from it (pure).
// Owner, 04.11.2026: one inbox with plus-addressing, so the customer never types an email.
const YM_PREFIX = "ym";
const YM_DIGITS = 4;
const PAYMENT_INBOX = { user: "ymmdpayments", domain: "gmail.com" };

/** Row id 1 → "ym0001"; numbers past 9999 simply grow ("ym10000"). */
export const formatYm = (id: number): string => `${YM_PREFIX}${String(id).padStart(YM_DIGITS, "0")}`;

export const paymentEmail = (ym: string): string => `${PAYMENT_INBOX.user}+${ym}@${PAYMENT_INBOX.domain}`;

export const isYm = (value: string): boolean => /^ym\d{4,}$/.test(value);
