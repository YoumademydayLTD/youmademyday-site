// The site's reader (signed in, entitled only): GET /api/read/:id, GET /api/read/:id/:n, POST /api/read/:id/:n/done.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { CATALOG } from "../catalog/index.ts";
import { titleFor } from "../delivery/items.ts";
import { ensureCustomer } from "../customers/repo.ts";
import { requireUser, type SiteUser } from "../account/session.ts";
import { listDoneUnits, setUnitDone } from "../db/progress.ts";
import { accessOf, canRead } from "./access.ts";
import { findView, VIEW_INDEX } from "./units.ts";

interface Reader { user: SiteUser; view: NonNullable<ReturnType<typeof findView>>; productId: string }

async function openReader(request: Request, env: Env, productId: string, now: Date): Promise<Reader> {
  const user = await requireUser(request, env);
  const customer = await ensureCustomer(env.DB, user.telegramId, now.toISOString());
  if (!canRead(await accessOf(env, customer), productId)) throw new HttpError("not_entitled", "this item is not in your library");
  const view = findView(VIEW_INDEX, productId, user.lang);
  if (!view) throw new HttpError("not_found", "this item has no reader version");
  return { user, view, productId };
}

function unitNumber(value: string, total: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > total) throw new HttpError("not_found", "no such lesson or chapter");
  return n;
}

export async function handleReadItem(request: Request, env: Env, productId: string, now: Date): Promise<unknown> {
  const { user, view } = await openReader(request, env, productId, now);
  const done = await listDoneUnits(env.DB, user.telegramId, productId);
  return {
    id: productId, kind: view.kind, title: titleFor(productId, user.lang, CATALOG), lang: view.lang,
    units: view.units.map((u) => ({ ...u, done: done.has(u.n) })), done: view.units.filter((u) => done.has(u.n)).length, total: view.units.length,
  };
}

export async function handleReadUnit(request: Request, env: Env, productId: string, nText: string, now: Date): Promise<unknown> {
  const { user, view } = await openReader(request, env, productId, now);
  const n = unitNumber(nText, view.units.length);
  const object = await env.FILES.get(view.key);
  if (!object) {
    console.error("reader: missing object", view.key);
    throw new HttpError("not_found", "this lesson is not available right now; please write to us");
  }
  const html = (await object.json<{ units: string[] }>()).units[n - 1] ?? "";
  const done = await listDoneUnits(env.DB, user.telegramId, productId);
  const unit = view.units[n - 1];
  return {
    id: productId, kind: view.kind, n, title: unit?.title ?? "", minutes: unit?.minutes ?? null, html,
    prev: n > 1 ? n - 1 : null, next: n < view.units.length ? n + 1 : null, done: done.has(n), doneCount: done.size, total: view.units.length,
  };
}

export async function handleReadDone(request: Request, env: Env, productId: string, nText: string, now: Date): Promise<unknown> {
  const { user, view } = await openReader(request, env, productId, now);
  const n = unitNumber(nText, view.units.length);
  const body = await readJsonObject(request);
  if (typeof body.done !== "boolean") throw new HttpError("bad_request", "done must be true or false");
  await setUnitDone(env.DB, { telegramId: user.telegramId, productId, n, isDone: body.done }, now.toISOString());
  const done = await listDoneUnits(env.DB, user.telegramId, productId);
  return { done: done.has(n), doneCount: done.size, total: view.units.length };
}
