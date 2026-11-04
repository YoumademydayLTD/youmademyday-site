// Calls for one conversation and for the shared quick replies (README "Support center").
import { request } from '../../core/api.js';

/** @typedef {import('../../core/threads.js').Thread} Thread */
/** @typedef {import('../../core/threads.js').Message} Message */
/** @typedef {{id: number, text: string}} QuickReply */

/**
 * Reading a thread also marks it read on the server.
 * @param {number} id
 * @param {AbortSignal} [signal]
 * @returns {Promise<{thread: Thread, messages: Message[]}>}
 */
export function fetchThread(id, signal) {
  return request(`/api/admin/threads/${id}`, { signal });
}

/**
 * Marks a thread read without reloading it (a new message landed on the open thread).
 * @param {number} id
 * @returns {Promise<{thread: Thread}>}
 */
export function markThreadRead(id) {
  return request(`/api/admin/threads/${id}/read`, { method: 'POST' });
}

/**
 * Text goes as JSON; with a photo the same call is multipart (`text` + `photo`).
 * @param {number} id
 * @param {{text: string, photo: File | null}} reply
 * @returns {Promise<{message: Message, thread: Thread}>}
 */
export function sendReply(id, { text, photo }) {
  const path = `/api/admin/threads/${id}/reply`;
  if (!photo) return request(path, { json: { text } });
  const form = new FormData();
  form.append('text', text);
  form.append('photo', photo, photo.name);
  return request(path, { form });
}

/**
 * @param {number} id
 * @param {'open' | 'resolved'} status
 * @returns {Promise<{thread: Thread}>}
 */
export function setThreadStatus(id, status) {
  return request(`/api/admin/threads/${id}/status`, { json: { status } });
}

/** @returns {Promise<{replies: QuickReply[]}>} */
export function fetchQuickReplies() {
  return request('/api/admin/quick-replies');
}

/**
 * @param {string} text
 * @returns {Promise<{reply: QuickReply}>}
 */
export function addQuickReply(text) {
  return request('/api/admin/quick-replies', { json: { text } });
}

/**
 * @param {number} id
 * @returns {Promise<{ok: true}>}
 */
export function deleteQuickReply(id) {
  return request(`/api/admin/quick-replies/${id}/delete`, { method: 'POST' });
}
