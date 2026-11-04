// The conversation as chat bubbles with day separators. Customer text only ever enters as text nodes.
import { fileUrl } from '../../core/api.js';
import { MEDIA_LABELS } from '../../core/constants.js';
import { h, replace } from '../../core/dom.js';
import { formatClock, formatDayLabel, isSameDay } from '../../core/format.js';
import { icon } from '../../core/icons.js';

/** @typedef {import('../../core/threads.js').Message} Message */

/** @param {Message} message */
function mediaBlock(message) {
  if (!message.mediaKind) return null;
  const label = MEDIA_LABELS[message.mediaKind];
  if (!message.fileId) return h('span', { class: 'media-label' }, label);
  const url = fileUrl(message.fileId);

  if (message.mediaKind === 'photo') {
    return h('a', { class: 'bubble-photo', href: url, target: '_blank', rel: 'noopener', 'aria-label': 'פתיחת התמונה בגודל מלא' },
      h('img', { src: url, alt: message.direction === 'in' ? 'תמונה מהלקוח' : 'תמונה שנשלחה', loading: 'lazy', decoding: 'async' }));
  }
  if (message.mediaKind === 'document') {
    return h('a', { class: 'file-link', href: url, download: message.fileName ?? '' },
      icon('file'), h('span', { dir: 'auto' }, message.fileName || label));
  }
  // Voice notes (OGG/Opus) do not play everywhere on iOS, so other media get a label and an open link.
  return h('span', { class: 'media-label' }, label, ' · ',
    h('a', { href: url, target: '_blank', rel: 'noopener' }, 'פתיחה'));
}

/** @param {Message} message */
function bubble(message) {
  const isCustomer = message.direction === 'in';
  return h('li', { class: `msg ${isCustomer ? 'msg-in' : 'msg-out'}`, dataset: { id: String(message.id) } },
    h('div', { class: 'bubble' },
      h('span', { class: 'sr' }, isCustomer ? 'הלקוח:' : 'הצוות:'),
      mediaBlock(message),
      message.text ? h('p', { class: 'bubble-text', dir: 'auto' }, message.text) : null,
      h('time', { class: 'bubble-time', datetime: message.createdAt }, formatClock(message.createdAt))));
}

/**
 * Redraws the whole list (a thread is at most a few hundred messages) and keeps the view pinned
 * to the bottom when it was already there.
 * @param {HTMLElement} list
 * @param {HTMLElement} scroller
 * @param {readonly Message[]} messages
 */
export function drawMessages(list, scroller, messages) {
  const isAtBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < scroller.clientHeight / 4;
  const now = Date.now();
  /** @type {HTMLElement[]} */
  const items = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    if (!previous || !isSameDay(previous.createdAt, message.createdAt)) {
      items.push(h('li', { class: 'day-sep' }, h('span', null, formatDayLabel(message.createdAt, { now }))));
    }
    items.push(bubble(message));
  });
  if (items.length === 0) items.push(h('li', { class: 'empty' }, 'אין הודעות עדיין.'));
  replace(list, items);
  if (!isAtBottom) return;
  scrollToEnd(scroller);
  // Photos get their height only once loaded; stay pinned to the newest message when they do.
  for (const img of list.querySelectorAll('img')) {
    if (!img.complete) img.addEventListener('load', () => scrollToEnd(scroller), { once: true });
  }
}

/** @param {HTMLElement} scroller */
export function scrollToEnd(scroller) {
  scroller.scrollTop = scroller.scrollHeight;
}
