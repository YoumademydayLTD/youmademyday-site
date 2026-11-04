// The personal area's view of memberships and invoices (pure). The ym number is internal and never appears here.
import type { Catalog } from "../catalog/index.ts";
import type { AccountOrder, AccountSubscription } from "../db/account.ts";
import { titleFor } from "../delivery/items.ts";
import { TRIAL_STATUS } from "../polar/subscriptions.ts";

// Statuses in which a membership can still be cancelled (it is running and will renew).
const CANCELLABLE = new Set(["active", TRIAL_STATUS]);

export interface MembershipView extends AccountSubscription { isTrial: boolean; canCancel: boolean }
export interface InvoiceView { orderId: string; createdAt: string; total: number; currency: string; status: string; items: { id: string; title: string }[]; url: string; documentUrl: string }

export const membershipView = (s: AccountSubscription): MembershipView =>
  ({ ...s, isTrial: s.status === TRIAL_STATUS, canCancel: CANCELLABLE.has(s.status) && !s.cancelAtPeriodEnd });

export const invoiceView = (order: AccountOrder, catalog: Catalog, lang: string, url: string, documentUrl: string): InvoiceView => ({
  orderId: order.id, createdAt: order.createdAt, total: order.totalAmount, currency: order.currency, status: order.status,
  items: order.itemIds.map((id) => ({ id, title: catalog.plans[id]?.titles[lang] ?? titleFor(id, lang, catalog) })), url, documentUrl,
});
