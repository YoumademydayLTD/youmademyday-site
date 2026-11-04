// The personal area (site, signed in): GET /api/account and POST /api/account/subscriptions/:id/cancel.
import type { Env } from "../env.ts";
import { CATALOG } from "../catalog/index.ts";
import { FILE_MANIFEST } from "../delivery/manifest.ts";
import { buildItems } from "../delivery/downloads.ts";
import { createFileToken, FILE_LINK_TTL_SECONDS } from "../delivery/token.ts";
import { listOrders, listSubscriptions } from "../db/account.ts";
import { accessOf } from "../view/access.ts";
import { libraryItem, type LibraryItem } from "../view/library.ts";
import { VIEW_INDEX } from "../view/units.ts";
import { doneCounts } from "../db/progress.ts";
import { ensureCustomer, type Customer } from "../customers/repo.ts";
import { requireUser } from "./session.ts";
import { invoiceView, membershipView, type InvoiceView, type MembershipView } from "./present.ts";
import { cancelMembership } from "./membership.ts";
import { INVOICE_KEY_PREFIX } from "./invoice.ts";
import { orderDocUrl } from "../orderdoc/link.ts";
import { docLang } from "../orderdoc/data.ts";

const MS_PER_SECOND = 1000;
export interface Account { library: LibraryItem[]; memberships: MembershipView[]; invoices: InvoiceView[] }

const origin = (request: Request): string => new URL(request.url).origin;

async function invoiceUrl(request: Request, env: Env, orderId: string, nowSeconds: number): Promise<string> {
  const token = await createFileToken({ key: `${INVOICE_KEY_PREFIX}${orderId}`, filename: `invoice-${orderId.slice(0, 8)}.pdf`, exp: nowSeconds + FILE_LINK_TTL_SECONDS }, env.FILES_SIGNING_SECRET);
  return `${origin(request)}/api/invoice?t=${token}`;
}

async function customerOf(request: Request, env: Env, now: Date): Promise<{ customer: Customer; lang: string; telegramId: number }> {
  const user = await requireUser(request, env);
  return { customer: await ensureCustomer(env.DB, user.telegramId, now.toISOString()), lang: user.lang, telegramId: user.telegramId };
}

export async function handleAccount(request: Request, env: Env, now: Date): Promise<Account> {
  const { customer, lang, telegramId } = await customerOf(request, env, now);
  const owner = { ym: customer.ym, polarCustomerId: customer.polarCustomerId };
  const nowSeconds = Math.floor(now.getTime() / MS_PER_SECOND);
  const [access, subscriptions, orders, done] = await Promise.all([accessOf(env, customer), listSubscriptions(env.DB, customer.polarCustomerId), listOrders(env.DB, owner), doneCounts(env.DB, telegramId)]);
  // Bought items first, then what running memberships include.
  const products = [...access.owned, ...access.viaPlan];
  const files = await buildItems(products.map((productId) => ({ productId, lang })),
    { catalog: CATALOG, manifest: FILE_MANIFEST, secret: env.FILES_SIGNING_SECRET, fileUrl: `${origin(request)}/api/file`, nowSeconds });
  const library = files.map((item) => libraryItem(item, { catalog: CATALOG, index: VIEW_INDEX, lang, viaPlan: access.viaPlan, done }));
  const docIn = docLang(lang, CATALOG);
  const invoices = await Promise.all(orders.map(async (o) => invoiceView(o, CATALOG, lang, await invoiceUrl(request, env, o.id, nowSeconds),
    await orderDocUrl(origin(request), env.FILES_SIGNING_SECRET, o.id, docIn, nowSeconds))));
  return { library, memberships: subscriptions.map(membershipView), invoices };
}

export async function handleAccountCancel(request: Request, env: Env, subscriptionId: string, now: Date): Promise<{ membership: MembershipView }> {
  const { customer } = await customerOf(request, env, now);
  return { membership: await cancelMembership(env, customer, subscriptionId, now) };
}
