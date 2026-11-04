// The buyer behind a checkout: our customer row (with its ym number) and its Polar customer, created on first purchase.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { PolarApiError, polarConfig } from "../polar/client.ts";
import { ensurePolarCustomer } from "../polar/customers.ts";
import { ensureCustomer, setPolarCustomer, type Customer } from "./repo.ts";

export async function ensureBuyer(env: Env, telegramId: number, now: Date): Promise<Customer> {
  const customer = await ensureCustomer(env.DB, telegramId, now.toISOString());
  if (customer.polarCustomerId) return customer;
  try {
    const polarCustomerId = await ensurePolarCustomer(polarConfig(env), customer.ym);
    await setPolarCustomer(env.DB, customer.id, polarCustomerId);
    return { ...customer, polarCustomerId };
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("buyer: Polar customer not created", customer.ym, error.status, error.detail);
    throw new HttpError("payment_provider_error", "the payment page could not be opened");
  }
}
