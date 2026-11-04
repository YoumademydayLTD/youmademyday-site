// An order's invoice PDF from Polar. Generation is asynchronous: ask once, then look again a few times.
import { HTTP_NOT_FOUND, PolarApiError, polarRequest, type PolarConfig } from "./client.ts";

const ATTEMPTS = 6;
const WAIT_MS = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function invoiceUrl(config: PolarConfig, orderId: string): Promise<string | null> {
  try {
    return (await polarRequest<{ url: string }>(config, "GET", `/orders/${encodeURIComponent(orderId)}/invoice`)).url;
  } catch (error) {
    if (error instanceof PolarApiError && error.status === HTTP_NOT_FOUND) return null;
    throw error;
  }
}

/** The download URL of an order's invoice, generating it first when Polar has none yet; null if still not ready. */
export async function fetchInvoiceUrl(config: PolarConfig, orderId: string): Promise<string | null> {
  const existing = await invoiceUrl(config, orderId);
  if (existing) return existing;
  await polarRequest(config, "POST", `/orders/${encodeURIComponent(orderId)}/invoice`);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    await sleep(WAIT_MS);
    const url = await invoiceUrl(config, orderId);
    if (url) return url;
  }
  return null;
}
