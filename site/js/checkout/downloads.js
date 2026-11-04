// Fetch an order's download links from the payment worker, waiting while the payment is being confirmed.
// Each request waits on the server up to ~20 s; the page gives up after about a minute and says what to do.
import { API_BASE } from "./config.js";

export const DOWNLOAD_WAIT_MS = 60000;
const RETRY_AFTER_ERROR_MS = 3000;
const REQUEST_TIMEOUT_MS = 25000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestOnce(checkoutId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/api/downloads?checkout=${encodeURIComponent(checkoutId)}&wait=1`, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `http ${response.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** { status: "ready", items } | { status: "refunded" } | { status: "late" }. isActive() stops the wait when the page changes. */
export async function waitForDownloads(checkoutId, isActive, now = () => Date.now()) {
  const deadline = now() + DOWNLOAD_WAIT_MS;
  while (now() < deadline && isActive()) {
    try {
      const data = await requestOnce(checkoutId);
      if (data.status === "ready" || data.status === "refunded") return data;
    } catch (error) {
      console.error("downloads: request failed, retrying", error);
      await sleep(RETRY_AFTER_ERROR_MS);
    }
  }
  return { status: "late" };
}
