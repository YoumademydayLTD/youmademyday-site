// GET /api/downloads?checkout=<id>[&wait=1] and GET /api/file?t=<token>.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { CATALOG } from "../catalog/index.ts";
import { FILE_MANIFEST } from "./manifest.ts";
import { listDownloads, type Downloads } from "./downloads.ts";
import { verifyFileToken } from "./token.ts";

const CHECKOUT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Long-poll: an unpaid order is re-checked for up to 20 s, so the thanks page needs only a few requests.
const LONG_POLL_MS = 20_000;
const POLL_INTERVAL_MS = 2_000;
const MS_PER_SECOND = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleDownloads(request: Request, env: Env): Promise<Downloads> {
  const params = new URL(request.url).searchParams;
  const checkoutId = params.get("checkout") ?? "";
  if (!CHECKOUT_ID.test(checkoutId)) throw new HttpError("bad_request", "checkout must be a checkout id");
  const fileUrl = `${new URL(request.url).origin}/api/file`;
  const started = Date.now();
  for (;;) {
    const context = { db: env.DB, catalog: CATALOG, manifest: FILE_MANIFEST, secret: env.FILES_SIGNING_SECRET, fileUrl, nowSeconds: Math.floor(Date.now() / MS_PER_SECOND) };
    const result = await listDownloads(context, { checkoutId });
    if (result.status !== "pending" || params.get("wait") !== "1" || Date.now() - started + POLL_INTERVAL_MS > LONG_POLL_MS) return result;
    await sleep(POLL_INTERVAL_MS);
  }
}

/** Content-Disposition for a download, ASCII name plus the RFC 5987 UTF-8 form. */
export const attachment = (filename: string): string =>
  `attachment; filename="${filename.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

export async function handleFile(request: Request, env: Env, now: Date): Promise<Response> {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const claim = await verifyFileToken(token, env.FILES_SIGNING_SECRET, Math.floor(now.getTime() / MS_PER_SECOND));
  if (!claim) throw new HttpError("unauthorized", "this download link has expired or is not valid; open your order page again for a new one");
  const object = await env.FILES.get(claim.key);
  if (!object) {
    console.error("delivery: missing object", claim.key);
    throw new HttpError("not_found", "this file is not available right now; please write to us");
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      "Content-Disposition": attachment(claim.filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
