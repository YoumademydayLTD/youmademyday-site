// Hebrew labels for statuses from the store. Unknown values are shown as they come, never hidden.

export const PURCHASE_STATUS = Object.freeze({
  paid: 'שולם',
  completed: 'הושלם',
  pending: 'ממתין',
  refunded: 'הוחזר',
  failed: 'נכשל',
  canceled: 'בוטל',
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  active: 'פעיל',
  trialing: 'תקופת ניסיון',
  past_due: 'תשלום באיחור',
  canceled: 'בוטל',
  expired: 'הסתיים',
  paused: 'מושהה',
});

/** Statuses shown in the calm green tag; the rest use the neutral tag. */
export const GOOD_STATUSES = Object.freeze(['paid', 'completed', 'active', 'trialing']);

/**
 * @param {Readonly<Record<string, string>>} table
 * @param {string | null | undefined} status
 */
export function statusLabel(table, status) {
  if (!status) return '—';
  return table[status] ?? status;
}
