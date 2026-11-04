// Our customer on Polar: external_id = the ym number, email = the plus-addressed payment inbox.
import { paymentEmail } from "../customers/ym.ts";
import { HTTP_NOT_FOUND, PolarApiError, polarRequest, type PolarConfig } from "./client.ts";

interface PolarCustomer { id: string; external_id: string | null; email: string }

/** The Polar customer id for a ym number, created on first use. */
export async function ensurePolarCustomer(config: PolarConfig, ym: string): Promise<string> {
  try {
    return (await polarRequest<PolarCustomer>(config, "GET", `/customers/external/${encodeURIComponent(ym)}`)).id;
  } catch (error) {
    if (!(error instanceof PolarApiError) || error.status !== HTTP_NOT_FOUND) throw error;
  }
  return (await polarRequest<PolarCustomer>(config, "POST", "/customers/", { external_id: ym, email: paymentEmail(ym), type: "individual" })).id;
}
