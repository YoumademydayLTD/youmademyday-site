// One inbox row. The element is kept per thread id and refilled in place, so focus survives live updates.
import { LANG_NAMES } from '../../core/constants.js';
import { h, replace } from '../../core/dom.js';
import { formatListTime, initialOf } from '../../core/format.js';
import { routeHash } from '../../core/router.js';
import { previewOf, unreadOf } from '../../core/threads.js';

/** @typedef {import('../../core/threads.js').Thread} Thread */

const MEDIA_PREVIEW = 'מדיה';

/** @returns {HTMLAnchorElement} */
export function createThreadRow() {
  return /** @type {HTMLAnchorElement} */ (h('a', { class: 'thread-row' }));
}

/**
 * @param {HTMLAnchorElement} row
 * @param {Thread} thread
 * @param {{isSelected: boolean, now: number}} state
 */
export function fillThreadRow(row, thread, { isSelected, now }) {
  const unread = unreadOf(thread.unread);
  const { name, username, lang } = thread.user;
  row.href = routeHash({ view: 'thread', threadId: thread.id });
  row.classList.toggle('is-unread', unread > 0);
  row.classList.toggle('is-resolved', thread.status === 'resolved');
  if (isSelected) row.setAttribute('aria-current', 'page');
  else row.removeAttribute('aria-current');

  const time = h('time', { class: 'row-time', datetime: thread.lastAt }, formatListTime(thread.lastAt, { now }));
  const badge = unread > 0
    ? h('span', { class: 'unread-badge', 'aria-label': `${unread} לא נקראו` }, String(unread))
    : null;

  replace(row,
    h('span', { class: 'avatar', 'aria-hidden': 'true' }, initialOf(name)),
    h('span', { class: 'row-main' },
      h('span', { class: 'row-top' },
        h('span', { class: 'row-name', dir: 'auto' }, name || 'ללא שם'),
        username ? h('span', { class: 'row-user', dir: 'ltr' }, `@${username}`) : null,
        h('span', { class: 'lang-chip', title: LANG_NAMES[/** @type {keyof typeof LANG_NAMES} */ (lang)] ?? lang }, lang),
        time),
      h('span', { class: 'row-bottom' },
        h('span', { class: 'row-preview', dir: 'auto' }, previewOf(thread.lastText, MEDIA_PREVIEW)),
        thread.status === 'resolved' ? h('span', { class: 'tag tag-ok' }, 'טופלה') : null,
        badge)));
}
