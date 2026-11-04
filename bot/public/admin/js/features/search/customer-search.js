// Customer search above the inbox: by internal customer number (ym0001), name, @username or Telegram id.
// Choosing a result opens that customer's latest thread, or just their card when they never wrote to us.
import { request } from '../../core/api.js';
import { h, replace, announce } from '../../core/dom.js';
import { errorMessage, isAbort } from '../../core/errors.js';

/** @typedef {{id: number, name: string, username: string | null, ym: string | null, threadId: number | null}} CustomerHit */

/**
 * @param {{onOpen: (hit: CustomerHit) => void}} options
 * @returns {HTMLElement}
 */
export function createCustomerSearch({ onOpen }) {
  /** @type {AbortController | null} */
  let searchAbort = null;
  const input = h('input', { type: 'search', class: 'search-input', name: 'q', placeholder: 'חיפוש לקוח: ym0001, שם או ‎@', 'aria-label': 'חיפוש לקוח לפי מספר לקוח, שם או שם משתמש', autocomplete: 'off', enterkeyhint: 'search' });
  const results = h('ul', { class: 'search-results', 'aria-label': 'תוצאות חיפוש' });

  /** @param {CustomerHit} hit */
  const resultRow = (hit) => h('li', null, h('button', { type: 'button', class: 'search-hit', onclick: () => { replace(results); input.value = ''; onOpen(hit); } },
    h('span', { class: 'row-name', dir: 'auto' }, hit.name || String(hit.id)),
    hit.username ? h('span', { class: 'row-user', dir: 'ltr' }, `@${hit.username}`) : null,
    h('span', { class: 'tag num', dir: 'ltr' }, hit.ym ?? 'ללא מספר')));

  /** @param {SubmitEvent} event */
  async function search(event) {
    event.preventDefault();
    const q = input.value.trim();
    if (!q) { replace(results); return; }
    searchAbort?.abort();
    const controller = new AbortController();
    searchAbort = controller;
    replace(results, h('li', { class: 'muted small' }, 'מחפש…'));
    try {
      const data = /** @type {{results: CustomerHit[]}} */ (await request(`/api/admin/customers?q=${encodeURIComponent(q)}`, { signal: controller.signal }));
      replace(results, ...(data.results.length ? data.results.map(resultRow) : [h('li', { class: 'muted small' }, 'לא נמצא לקוח.')]));
      announce(data.results.length ? `נמצאו ${data.results.length} לקוחות` : 'לא נמצא לקוח');
    } catch (error) {
      if (isAbort(error)) return;
      replace(results, h('li', { class: 'form-error', role: 'alert' }, `החיפוש נכשל. ${errorMessage(error)}`));
    }
  }

  return h('form', { class: 'customer-search', role: 'search', onsubmit: search }, input, results);
}
