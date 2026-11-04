// GET /api/invoice?t=<signed token>: an order's invoice PDF, fetched from Polar and passed through, so the
// Polar token and URLs never reach the browser. The token is the same short-lived signed link as for files.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { PolarApiError, polarConfig } from "../polar/client.ts";
import { fetchInvoiceUrl } from "../polar/invoices.ts";
import { verifyFileToken } from "../delivery/token.ts";
import { attachment } from "../delivery/handler.ts";

export const INVOICE_KEY_PREFIX = "invoice:";
const MS_PER_SECOND = 1000;

export async function handleInvoice(request: Request, env: Env, now: Date): Promise<Response> {
  const claim = await verifyFileToken(new URL(request.url).searchParams.get("t") ?? "", env.FILES_SIGNING_SECRET, Math.floor(now.getTime() / MS_PER_SECOND));
  if (!claim?.key.startsWith(INVOICE_KEY_PREFIX)) throw new HttpError("unauthorized", "this invoice link has expired or is not valid; open your personal area again for a new one");
  const orderId = claim.key.slice(INVOICE_KEY_PREFIX.length);
  let url: string | null;
  try {
    url = await fetchInvoiceUrl(polarConfig(env), orderId);
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("invoice: Polar refused", orderId, error.status, error.detail);
    throw new HttpError("payment_provider_error", "the invoice is not available right now; please try again later");
  }
  if (!url) throw new HttpError("payment_provider_error", "the invoice is still being prepared; try again in a minute");
  const pdf = await fetch(url);
  if (!pdf.ok || !pdf.body) throw new HttpError("payment_provider_error", "the invoice could not be downloaded; please try again later");
  return new Response(pdf.body, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": attachment(claim.filename), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
