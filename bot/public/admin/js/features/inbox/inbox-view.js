// Inbox pane: the status filter and the thread list, redrawn from the inbox store on every change.
import { MS_PER_MINUTE, THREAD_FILTERS } from '../../core/constants.js';
import { h, replace } from '../../core/dom.js';
import { errorMessage } from '../../core/errors.js';
import { inboxStore } from '../../core/inbox-store.js';
import { filterThreads, sortThreads } from '../../core/threads.js';
import { createThreadRow, fillThreadRow } from './thread-row.js';

const EMPTY_TEXT = Object.freeze({ open: 'אין שיחות פתוחות. הכל טופל.', resolved: 'עדיין אין שיחות שטופלו.', all: 'עדיין אין שיחות.' });

/**
 * @param {HTMLElement} pane
 * @returns {{setSelected: (id: number | null) => void, destroy: () => void}}
 */
export function renderInbox(pane) {
  /** @type {number | null} */
  let selectedId = null;
  /** @type {Map<number, HTMLAnchorElement>} */
  const rows = new Map();

  const filterButtons = THREAD_FILTERS.map(({ value, label }) => h('button', {
    type: 'button', class: 'seg-btn', dataset: { value },
    onclick: () => inboxStore.setFilter(/** @type {import('../../core/inbox-store.js').ThreadFilter} */ (value)),
  }, label));
  const list = h('ul', { class: 'thread-list', 'aria-label': 'שיחות' });
  const scroller = h('div', { class: 'pane-scroll' }, list);

  replace(pane,
    h('div', { class: 'pane-head' },
      h('h2', { class: 'pane-title' }, 'שיחות'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'סינון לפי מצב' }, filterButtons)),
    scroller);

  function draw() {
    const filter = inboxStore.filter();
    for (const btn of filterButtons) btn.setAttribute('aria-pressed', String(btn.dataset.value === filter));

    if (!inboxStore.isLoaded()) {
      const error = inboxStore.loadError();
      replace(list, error
        ? h('li', { class: 'empty', role: 'alert' }, `לא הצלחנו לטעון את השיחות. ${errorMessage(error)}`,
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm retry', onclick: retry }, 'נסו שוב'))
        : h('li', { class: 'empty' }, 'טוען שיחות…'));
      return;
    }
    const visible = sortThreads(filterThreads(inboxStore.all(), filter));
    if (visible.length === 0) {
      rows.clear();
      replace(list, h('li', { class: 'empty' }, EMPTY_TEXT[filter]));
      return;
    }
    const now = Date.now();
    const items = visible.map((thread) => {
      let row = rows.get(thread.id);
      if (!row) {
        row = createThreadRow();
        rows.set(thread.id, row);
      }
      fillThreadRow(row, thread, { isSelected: thread.id === selectedId, now });
      // One <li> per thread, reused, so a reorder moves rows instead of rebuilding them.
      return /** @type {HTMLElement} */ (row.parentElement ?? h('li', null, row));
    });
    const visibleIds = new Set(visible.map((t) => t.id));
    for (const id of rows.keys()) if (!visibleIds.has(id)) rows.delete(id);
    const focused = document.activeElement;
    list.replaceChildren(...items);
    // Moving a node blurs it; put focus back so keyboard users keep their place when a live message reorders the list.
    if (focused instanceof HTMLElement && focused !== document.activeElement && list.contains(focused)) focused.focus({ preventScroll: true });
  }

  function retry() {
    inboxStore.load().catch((error) => console.error('Inbox retry failed', error));
  }

  const unsubscribe = inboxStore.subscribe(draw);
  draw();
  // Relative times («לפני 3 דק׳») age; redraw them once a minute. A local clock only, no network.
  const clock = setInterval(draw, MS_PER_MINUTE);

  return {
    setSelected(id) {
      selectedId = id;
      draw();
    },
    destroy() {
      unsubscribe();
      clearInterval(clock);
    },
  };
}
