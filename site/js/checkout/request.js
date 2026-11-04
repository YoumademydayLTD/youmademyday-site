// One call to the payment worker: the signed-in visitor's session goes along as a Bearer token, the call
// gives up after a timeout, and a refusal comes back as a StoreError that carries the worker's error code.
import { API_BASE } from "./config.js";
import { getSessionToken } from "../telegram/session.js";

const DEFAULT_TIMEOUT_MS = 15000;
const HTTP_UNAUTHORIZED = 401;
export const LOGIN_REQUIRED = "login_required";

export class StoreError extends Error {
  /** code: the worker's error code (or "http <status>"); status: the HTTP status, 0 when nothing came back. */
  constructor(code, status) {
    super(code);
    this.name = "StoreError";
    this.code = code;
    this.status = status;
  }
}

/** True when the worker refused because the session is missing or no longer valid. */
export const isLoginRequired = (error) => error instanceof StoreError
  && (error.code === LOGIN_REQUIRED || error.status === HTTP_UNAUTHORIZED);

function headersFor(body) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** The worker's JSON reply for path. Throws StoreError when it refuses, or the fetch error when it is unreachable. */
export async function callStore(path, { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: headersFor(body),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new StoreError(typeof data.error === "string" ? data.error : `http ${response.status}`, response.status);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
