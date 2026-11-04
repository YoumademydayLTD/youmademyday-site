// The one door to the Worker API. Same origin, so the HttpOnly admin cookie rides along on its own;
// this code never sees a token.

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status, 0 when the network failed
   * @param {string} code the `error` field of the JSON error body
   * @param {string} message
   */
  constructor(status, code, message) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Sign-in calls answer 401 for a wrong code; that must not bounce the user back to the sign-in screen. */
const LOGIN_PREFIX = '/api/admin/login/';

/** @type {Set<() => void>} */
const unauthorizedListeners = new Set();

/**
 * Runs when any call answers 401 (the cookie expired or was never set).
 * @param {() => void} listener
 */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
}

/**
 * @typedef {object} RequestOptions
 * @property {'GET' | 'POST'} [method]
 * @property {unknown} [json] JSON body
 * @property {FormData} [form] multipart body
 * @property {AbortSignal} [signal]
 */

/**
 * @template T
 * @param {string} path
 * @param {RequestOptions} [options]
 * @returns {Promise<T>}
 */
export async function request(path, options = {}) {
  const { method = options.json !== undefined || options.form ? 'POST' : 'GET', json, form, signal } = options;
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/json' };
  /** @type {BodyInit | undefined} */
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // the browser sets the multipart boundary itself
  }

  let response;
  try {
    response = await fetch(path, { method, headers, body, signal, credentials: 'same-origin' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network', 'network');
  }

  if (!response.ok) {
    const error = await readError(response);
    if (response.status === 401 && !path.startsWith(LOGIN_PREFIX)) unauthorizedListeners.forEach((fn) => fn());
    throw error;
  }
  try {
    return /** @type {T} */ (await response.json());
  } catch {
    throw new ApiError(response.status, 'bad_json', 'bad_json');
  }
}

/**
 * Turns an error response into an ApiError; the body may be missing or not JSON (a proxy page, say).
 * @param {Response} response
 * @returns {Promise<ApiError>}
 */
async function readError(response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return new ApiError(response.status, String(data.error ?? 'http'), String(data.message ?? ''));
  } catch {
    return new ApiError(response.status, 'http', text.slice(0, 200));
  }
}

/**
 * Same-origin media proxy for a customer's file (README: GET /admin/file/:fileId).
 * @param {string} fileId
 */
export function fileUrl(fileId) {
  return `/admin/file/${encodeURIComponent(fileId)}`;
}
