// The personal area's calls to the payment worker. Both need the Telegram session (sent by callStore).
import { callStore, StoreError } from "../checkout/request.js";

const asList = (value) => (Array.isArray(value) ? value : []);

/** { library, memberships, invoices }, each a list (empty when the worker leaves one out). */
export async function fetchAccount() {
  const data = await callStore("/api/account");
  return { library: asList(data.library), memberships: asList(data.memberships), invoices: asList(data.invoices) };
}

/** Cancels a membership; resolves to its new state, the same shape as in fetchAccount(). */
export async function cancelMembership(id) {
  const data = await callStore(`/api/account/subscriptions/${encodeURIComponent(id)}/cancel`, { method: "POST", body: {} });
  if (typeof data.membership?.id !== "string") throw new StoreError("bad_reply", 0);
  return data.membership;
}
