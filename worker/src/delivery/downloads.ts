// The downloads of one order with fresh signed links. The thanks page uses it by checkout id; the Telegram bot
// can use it by order id. Pure apart from the database reads passed in through the context.
import type { Catalog } from "../catalog/index.ts";
import { findOrder, findOrderByCheckout, listEntitlements, type Entitlement, type OrderStatus } from "../db/entitlements.ts";
import type { FileManifest } from "./manifest.ts";
import { pickFile, titleFor } from "./items.ts";
import { createFileToken, FILE_LINK_TTL_SECONDS } from "./token.ts";

export interface DeliveryContext {
  db: D1Database;
  catalog: Catalog;
  manifest: FileManifest;
  secret: string;
  fileUrl: string; // the worker's /api/file address
  nowSeconds: number;
}
export type OrderRef = { checkoutId: string } | { orderId: string };
export interface DownloadItem { id: string; title: string; url: string; filename: string; lang: string; size: number; expiresAt: number }
export type Downloads = { status: "pending" } | { status: "refunded" } | { status: "ready"; items: DownloadItem[] };

const DELIVERING = new Set(["paid", "partially_refunded"]);

export async function buildItems(entitlements: Entitlement[], ctx: Omit<DeliveryContext, "db">): Promise<DownloadItem[]> {
  const expiresAt = ctx.nowSeconds + FILE_LINK_TTL_SECONDS;
  const items: DownloadItem[] = [];
  for (const { productId, lang } of entitlements) {
    const file = pickFile(productId, lang, ctx.manifest);
    if (!file) { console.error("delivery: no file for", productId, lang); continue; }
    const token = await createFileToken({ key: file.key, filename: file.filename, exp: expiresAt }, ctx.secret);
    items.push({ id: productId, title: titleFor(productId, lang, ctx.catalog), url: `${ctx.fileUrl}?t=${token}`, filename: file.filename, lang: file.lang, size: file.size, expiresAt });
  }
  return items;
}

export function statusOf(order: OrderStatus | null): "pending" | "refunded" | "ready" {
  if (order && DELIVERING.has(order.status)) return "ready";
  return order?.status === "refunded" ? "refunded" : "pending";
}

export async function listDownloads(ctx: DeliveryContext, ref: OrderRef): Promise<Downloads> {
  const order = "checkoutId" in ref ? await findOrderByCheckout(ctx.db, ref.checkoutId) : await findOrder(ctx.db, ref.orderId);
  const status = statusOf(order);
  if (status !== "ready" || !order) return { status: status === "refunded" ? "refunded" : "pending" };
  return { status: "ready", items: await buildItems(await listEntitlements(ctx.db, order.id), ctx) };
}
