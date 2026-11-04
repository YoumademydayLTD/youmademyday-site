// App frame: top bar (brand, tabs, live state, sign-out) and the panes. Only layout state lives here;
// which pane shows is CSS driven by data-view / data-card on the root.
import { h, replace } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { brandMark } from './brand-mark.js';

/** @typedef {import('../../core/live.js').LiveStatus} LiveStatus */
/** @typedef {'inbox' | 'thread' | 'content'} ShellView */

const LIVE_TEXT = Object.freeze({ connecting: 'מתחבר…', live: 'מחובר', offline: 'אין חיבור, מנסה שוב' });
/** Matches the CSS breakpoint where the card stops being a sheet and becomes a fixed third column. */
const WIDE_QUERY = '(min-width: 1200px)';

/**
 * @param {HTMLElement} root
 * @param {{onLogout: () => void}} options
 */
export function createShell(root, { onLogout }) {
  const unreadBadge = h('span', { class: 'tab-badge', hidden: true });
  const tabInbox = h('a', { class: 'tab', href: '#/inbox' }, icon('chat'), h('span', null, 'שיחות'), unreadBadge);
  const tabContent = h('a', { class: 'tab', href: '#/content' }, icon('book'), h('span', null, 'תוכן'));
  const liveDot = h('span', { class: 'live-dot', role: 'status', dataset: { status: 'connecting' } },
    h('span', { class: 'sr' }, LIVE_TEXT.connecting));

  const appbar = h('header', { class: 'appbar' },
    h('div', { class: 'brand' }, brandMark(), h('span', { class: 'brand-name' }, 'מרכז התמיכה')),
    h('nav', { class: 'tabs', 'aria-label': 'ניווט ראשי' }, tabInbox, tabContent),
    liveDot,
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'יציאה', title: 'יציאה', onclick: onLogout }, icon('logout')));

  const panes = {
    inbox: h('section', { class: 'pane pane-inbox', 'aria-label': 'רשימת השיחות' }),
    thread: h('section', { class: 'pane pane-thread', 'aria-label': 'השיחה' }),
    card: h('aside', { class: 'pane pane-card', id: 'card-pane', 'aria-labelledby': 'card-title', tabindex: '-1' }),
    content: h('section', { class: 'pane pane-content', 'aria-label': 'תוכן יומי' }),
  };
  const scrim = h('div', { class: 'scrim', 'aria-hidden': 'true' });
  const app = h('div', { class: 'app', dataset: { view: 'inbox', card: 'closed' } },
    appbar,
    h('main', { class: 'panes', id: 'main' }, panes.inbox, panes.thread, panes.card, panes.content),
    scrim);
  replace(root, app);

  const wide = matchMedia(WIDE_QUERY);
  const isCardSheet = () => !wide.matches;

  /** While the card is a sheet over the thread, the rest of the page must not take focus or clicks. */
  function syncInert() {
    const isSheetOpen = app.dataset.card === 'open' && isCardSheet() && app.dataset.view === 'thread';
    for (const el of [appbar, panes.inbox, panes.thread]) el.inert = isSheetOpen;
  }
  wide.addEventListener('change', syncInert);

  return {
    panes,
    scrim,
    isCardSheet,
    /** @param {ShellView} view */
    setView(view) {
      app.dataset.view = view;
      /** @type {[HTMLAnchorElement, boolean][]} */
      const tabs = [[tabInbox, view !== 'content'], [tabContent, view === 'content']];
      for (const [tab, isOn] of tabs) {
        if (isOn) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
      }
      syncInert();
    },
    /** @param {boolean} isOpen */
    setCardOpen(isOpen) {
      app.dataset.card = isOpen ? 'open' : 'closed';
      syncInert();
    },
    isCardOpen: () => app.dataset.card === 'open',
    /** @param {number} count */
    setUnread(count) {
      unreadBadge.hidden = count === 0;
      unreadBadge.textContent = String(count);
      tabInbox.setAttribute('aria-label', count ? `שיחות, ${count} לא נקראו` : 'שיחות');
    },
    /** @param {LiveStatus} status */
    setLive(status) {
      liveDot.dataset.status = status;
      replace(liveDot, h('span', { class: 'sr' }, LIVE_TEXT[status]));
      liveDot.title = LIVE_TEXT[status];
    },
  };
}
