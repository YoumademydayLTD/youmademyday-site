// Calls to the Polar API from the worker. Errors keep Polar's own detail for logs and server callers.
import type { PolarCheckoutBody } from "./checkout-body.ts";

export interface PolarCheckout { id: string; url: string; status: string; expires_at: string; total_amount: number; currency: string }
export interface PolarConfig { apiBase: string; token: string; fetcher?: typeof fetch }

const DETAIL_CHARS = 500;

export class PolarApiError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, detail: string) {
    super(`Polar answered ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

export async function createCheckout(config: PolarConfig, body: PolarCheckoutBody): Promise<PolarCheckout> {
  const fetcher = config.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(`${config.apiBase}/checkouts/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new PolarApiError(0, `network error: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  if (!response.ok) throw new PolarApiError(response.status, text.slice(0, DETAIL_CHARS));
  return JSON.parse(text) as PolarCheckout;
}
