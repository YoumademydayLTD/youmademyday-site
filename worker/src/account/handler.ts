// The personal area (site, signed in): GET /api/account and POST /api/account/subscriptions/:id/cancel.
import type { Env } from "../env.ts";
import { CATALOG } from "../catalog/index.ts";
import { FILE_MANIFEST } from "../delivery/manifest.ts";
import { buildItems, type DownloadItem } from "../delivery/downloads.ts";
import { createFileToken, FILE_LINK_TTL_SECONDS } from "../delivery/token.ts";
import { listOrders, listOwnedProducts, listSubscriptions } from "../db/account.ts";
import { ensureCustomer, type Customer } from "../customers/repo.ts";
import { requireUser } from "./session.ts";
import { invoiceView, membershipView, type InvoiceView, type MembershipView } from "./present.ts";
import { cancelMembership } from "./membership.ts";
import { INVOICE_KEY_PREFIX } from "./invoice.ts";
import { orderDocUrl } from "../orderdoc/link.ts";
import { docLang } from "../orderdoc/data.ts";

const MS_PER_SECOND = 1000;
export interface Account { library: DownloadItem[]; memberships: MembershipView[]; invoices: InvoiceView[] }

const origin = (request: Request): string => new URL(request.url).origin;

async function invoiceUrl(request: Request, env: Env, orderId: string, nowSeconds: number): Promise<string> {
  const token = await createFileToken({ key: `${INVOICE_KEY_PREFIX}${orderId}`, filename: `invoice-${orderId.slice(0, 8)}.pdf`, exp: nowSeconds + FILE_LINK_TTL_SECONDS }, env.FILES_SIGNING_SECRET);
  return `${origin(request)}/api/invoice?t=${token}`;
}

async function customerOf(request: Request, env: Env, now: Date): Promise<{ customer: Customer; lang: string }> {
  const user = await requireUser(request, env);
  return { customer: await ensureCustomer(env.DB, user.telegramId, now.toISOString()), lang: user.lang };
}

export async function handleAccount(request: Request, env: Env, now: Date): Promise<Account> {
  const { customer, lang } = await customerOf(request, env, now);
  const owner = { ym: customer.ym, polarCustomerId: customer.polarCustomerId };
  const nowSeconds = Math.floor(now.getTime() / MS_PER_SECOND);
  const [products, subscriptions, orders] = await Promise.all([listOwnedProducts(env.DB, owner), listSubscriptions(env.DB, customer.polarCustomerId), listOrders(env.DB, owner)]);
  const library = await buildItems(products.map((productId) => ({ productId, lang })),
    { catalog: CATALOG, manifest: FILE_MANIFEST, secret: env.FILES_SIGNING_SECRET, fileUrl: `${origin(request)}/api/file`, nowSeconds });
  const docIn = docLang(lang, CATALOG);
  const invoices = await Promise.all(orders.map(async (o) => invoiceView(o, CATALOG, lang, await invoiceUrl(request, env, o.id, nowSeconds),
    await orderDocUrl(origin(request), env.FILES_SIGNING_SECRET, o.id, docIn, nowSeconds))));
  return { library, memberships: subscriptions.map(membershipView), invoices };
}

export async function handleAccountCancel(request: Request, env: Env, subscriptionId: string, now: Date): Promise<{ membership: MembershipView }> {
  const { customer } = await customerOf(request, env, now);
  return { membership: await cancelMembership(env, customer, subscriptionId, now) };
}
