// Thread pane: header (back, name, card, resolve/reopen), the message history, quick replies and the reply box.
import { LANG_NAMES, MARK_READ_DEBOUNCE_MS } from '../../core/constants.js';
import { h, replace } from '../../core/dom.js';
import { errorMessage, isAbort } from '../../core/errors.js';
import { icon } from '../../core/icons.js';
import { inboxStore } from '../../core/inbox-store.js';
import { addMessage } from '../../core/threads.js';
import { createComposer } from './composer.js';
import { drawMessages, scrollToEnd } from './message-list.js';
import { createQuickReplies } from './quick-replies.js';
import { fetchThread, markThreadRead, sendReply, setThreadStatus } from './thread-api.js';

/** @typedef {import('../../core/threads.js').Message} Message */

/**
 * @param {HTMLElement} pane
 * @param {{onToggleCard: () => void}} options
 * @returns {{open: (id: number) => void, close: () => void, resync: () => void, setCardExpanded: (isOpen: boolean) => void, destroy: () => void}}
 */
export function renderThreadPane(pane, { onToggleCard }) {
  /** @type {number | null} */
  let currentId = null;
  /** @type {Message[]} */
  let messages = [];
  /** @type {AbortController | null} */
  let loadAbort = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let markReadTimer;

  const title = h('h2', { class: 'thread-title', id: 'thread-title', tabindex: '-1', dir: 'auto' });
  const subtitle = h('p', { class: 'thread-sub' });
  const statusButton = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: toggleStatus });
  const cardButton = h('button', {
    type: 'button', class: 'icon-btn card-toggle', 'aria-controls': 'card-pane', 'aria-expanded': 'false',
    'aria-label': 'פרטי הלקוח', title: 'פרטי הלקוח', onclick: onToggleCard,
  }, icon('person'));
  const list = h('ol', { class: 'msg-list', 'aria-labelledby': 'thread-title' });
  const scroller = h('div', { class: 'pane-scroll msg-scroll' }, list);
  const notice = h('p', { class: 'form-error thread-error', role: 'alert' });
  const composer = createComposer({ onSend: send });
  const quickReplies = createQuickReplies({ onPick: (text) => composer.insertText(text) });

  const header = h('div', { class: 'pane-head thread-head' },
    h('a', { class: 'icon-btn back-btn', href: '#/inbox', 'aria-label': 'חזרה לשיחות' }, icon('back')),
    h('div', { class: 'thread-who' }, title, subtitle),
    h('div', { class: 'thread-actions' }, statusButton, cardButton));
  const body = h('div', { class: 'thread-body' }, header, scroller, notice, h('div', { class: 'thread-foot' }, quickReplies, composer.el));
  const placeholder = h('div', { class: 'thread-empty' }, icon('chat'), h('p', null, 'בחרו שיחה מהרשימה'));
  replace(pane, placeholder);

  function drawHeader() {
    const thread = currentId === null ? undefined : inboxStore.get(currentId);
    if (!thread) return;
    const { name, username, lang } = thread.user;
    title.textContent = name || 'ללא שם';
    replace(subtitle,
      username ? h('span', { dir: 'ltr' }, `@${username}`) : null,
      h('span', { class: 'lang-chip' }, LANG_NAMES[/** @type {keyof typeof LANG_NAMES} */ (lang)] ?? lang),
      thread.status === 'resolved' ? h('span', { class: 'tag tag-ok' }, 'טופלה') : null);
    replace(statusButton, thread.status === 'open' ? [icon('check'), 'סימון כטופלה'] : [icon('reopen'), 'פתיחה מחדש']);
  }

  /** @param {number} id @param {{isRefresh: boolean}} mode */
  async function load(id, { isRefresh }) {
    loadAbort?.abort();
    const controller = new AbortController();
    loadAbort = controller;
    try {
      const data = await fetchThread(id, controller.signal);
      if (currentId !== id) return;
      // Merge rather than replace: a live message may have landed while the request was in flight.
      messages = data.messages.reduce(addMessage, isRefresh ? messages : []);
      inboxStore.put({ ...data.thread, unread: 0 });
      notice.textContent = '';
      drawMessages(list, scroller, messages);
      if (!isRefresh) scrollToEnd(scroller);
    } catch (error) {
      if (isAbort(error) || currentId !== id) return;
      notice.textContent = `לא הצלחנו לטעון את השיחה. ${errorMessage(error)}`;
      if (!isRefresh) replace(list);
    }
  }

  /** @param {{text: string, photo: File | null}} reply */
  async function send(reply) {
    if (currentId === null) return;
    const result = await sendReply(currentId, reply);
    inboxStore.receive(result);
  }

  async function toggleStatus() {
    const thread = currentId === null ? undefined : inboxStore.get(currentId);
    if (!thread) return;
    statusButton.disabled = true;
    try {
      const result = await setThreadStatus(thread.id, thread.status === 'open' ? 'resolved' : 'open');
      inboxStore.put(result.thread);
      notice.textContent = '';
    } catch (error) {
      notice.textContent = errorMessage(error);
    } finally {
      statusButton.disabled = false;
    }
  }

  const unsubscribeHeader = inboxStore.subscribe(drawHeader);
  const unsubscribeMessages = inboxStore.onMessage(({ thread, message }) => {
    if (thread.id !== currentId) return;
    messages = addMessage(messages, message);
    drawMessages(list, scroller, messages);
    if (message.direction === 'out') scrollToEnd(scroller);
    // No mark-read endpoint: re-reading the open thread is what clears its unread count on the server.
    if (message.direction === 'in') {
      inboxStore.markRead(thread.id);
      clearTimeout(markReadTimer);
      markReadTimer = setTimeout(() => void markThreadRead(thread.id).catch((error) => console.warn('mark read failed', error)), MARK_READ_DEBOUNCE_MS);
    }
  });

  return {
    open(id) {
      if (currentId === id) return;
      currentId = id;
      messages = [];
      composer.reset();
      notice.textContent = '';
      replace(list, h('li', { class: 'empty' }, 'טוען…'));
      if (!body.isConnected) replace(pane, body);
      drawHeader();
      void load(id, { isRefresh: false });
    },
    close() {
      currentId = null;
      loadAbort?.abort();
      clearTimeout(markReadTimer);
      replace(pane, placeholder);
    },
    destroy() {
      unsubscribeHeader();
      unsubscribeMessages();
      currentId = null;
      loadAbort?.abort();
      clearTimeout(markReadTimer);
    },
    resync() {
      if (currentId !== null) void load(currentId, { isRefresh: true });
    },
    setCardExpanded(isOpen) {
      cardButton.setAttribute('aria-expanded', String(isOpen));
    },
  };
}
