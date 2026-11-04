// Admin sign-in calls (README "Support center": like the site's sign-in, but the cookie is set instead of a session).
import { request } from '../../core/api.js';

/** @typedef {{token: string, deepLink: string, expiresAt: number}} LoginStart */
/** @typedef {{status: 'pending' | 'expired' | 'ok'}} LoginWait */

/** @returns {Promise<LoginStart>} */
export function startLogin() {
  return request('/api/admin/login/start', { json: {} });
}

/**
 * Long-poll: the server answers within ~20 s.
 * @param {string} token
 * @param {AbortSignal} signal
 * @returns {Promise<LoginWait>}
 */
export function waitLogin(token, signal) {
  return request('/api/admin/login/wait', { json: { token }, signal });
}

/**
 * @param {string} code
 * @returns {Promise<{status: 'ok'}>}
 */
export function verifyCode(code) {
  return request('/api/admin/login/verify', { json: { code } });
}

/** @returns {Promise<{admin: {id: number, name: string}}>} */
export function fetchAdmin() {
  return request('/api/admin/me');
}

/** @returns {Promise<{ok: true}>} */
export function logout() {
  return request('/api/admin/logout', { method: 'POST' });
}
