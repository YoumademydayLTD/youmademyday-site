// The sign-in calls of the bot worker (contract: bot/README.md, "Site sign-in"). Each call resolves to
// { status, data } with the HTTP status, or status NETWORK_FAILED when the network, a timeout or an abort
// stopped it, so callers map every outcome without try/catch. Tokens and sessions are never logged.
import { BOT_API_BASE } from "./config.js";

export const NETWORK_FAILED = 0;
const TIMEOUT_MS = 15000;
const WAIT_TIMEOUT_MS = 25000; // the server holds a wait for up to ~20 s

async function call(path, { method = "POST", body, session, signal, timeoutMs = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers.Authorization = `Bearer ${session}`;
  try {
    const response = await fetch(`${BOT_API_BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    console.error(`login: ${method} ${path} did not reach the server`, error.name);
    return { status: NETWORK_FAILED, data: {} };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export const requestStart = () => call("/api/login/start", { body: {} });
export const requestWait = (token, signal) => call("/api/login/wait", { body: { token }, signal, timeoutMs: WAIT_TIMEOUT_MS });
export const requestVerify = (code) => call("/api/login/verify", { body: { code } });
export const requestMe = (session) => call("/api/me", { method: "GET", session });
export const requestLogout = (session) => call("/api/logout", { session });
