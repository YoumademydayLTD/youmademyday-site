// Quick replies: saved texts shown as chips that insert into the reply box; add and delete in place.
import { h, replace } from '../../core/dom.js';
import { errorMessage } from '../../core/errors.js';
import { icon } from '../../core/icons.js';
import { addQuickReply, deleteQuickReply, fetchQuickReplies } from './thread-api.js';

/** @typedef {import('./thread-api.js').QuickReply} QuickReply */

/**
 * @param {{onPick: (text: string) => void}} options
 * @returns {HTMLElement}
 */
export function createQuickReplies({ onPick }) {
  /** @type {QuickReply[] | null} null until first opened */
  let replies = null;

  const list = h('ul', { class: 'qr-list', 'aria-label': 'תשובות שמורות' });
  const input = /** @type {HTMLInputElement} */ (h('input', {
    id: 'qr-new', class: 'field', dir: 'auto', placeholder: 'תשובה חדשה', maxlength: '1000',
  }));
  const error = h('p', { class: 'form-error', role: 'alert' });
  const panel = h('div', { id: 'qr-panel', class: 'qr-panel', hidden: true },
    list,
    h('form', { class: 'qr-add', onsubmit: onAdd },
      h('label', { class: 'sr', for: 'qr-new' }, 'טקסט לתשובה מהירה חדשה'),
      input,
      h('button', { type: 'submit', class: 'btn btn-ghost btn-sm' }, icon('plus'), 'הוספה')),
    error);
  const toggle = h('button', {
    type: 'button', class: 'chip qr-toggle', 'aria-expanded': 'false', 'aria-controls': 'qr-panel', onclick: onToggle,
  }, icon('bolt'), 'תשובות מהירות');

  function draw() {
    if (replies === null) {
      replace(list, h('li', { class: 'muted small' }, 'טוען…'));
      return;
    }
    if (replies.length === 0) {
      replace(list, h('li', { class: 'muted small' }, 'עוד אין תשובות שמורות.'));
      return;
    }
    replace(list, replies.map((reply) => h('li', { class: 'qr-item' },
      h('button', { type: 'button', class: 'chip qr-chip', dir: 'auto', title: reply.text, onclick: () => pick(reply.text) }, reply.text),
      h('button', { type: 'button', class: 'icon-btn qr-del', 'aria-label': `מחיקת התשובה: ${reply.text}`, onclick: () => onDelete(reply) }, icon('trash')))));
  }

  /** @param {boolean} isOpen */
  function setOpen(isOpen) {
    panel.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

  async function onToggle() {
    const isOpen = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(isOpen);
    if (isOpen && replies === null) await load();
  }

  /** The panel folds away after a pick so the phone shows the conversation again. @param {string} text */
  function pick(text) {
    setOpen(false);
    onPick(text);
  }

  async function load() {
    draw();
    try {
      replies = (await fetchQuickReplies()).replies;
      error.textContent = '';
    } catch (failure) {
      replies = [];
      error.textContent = errorMessage(failure);
    }
    draw();
  }

  /** @param {SubmitEvent} event */
  async function onAdd(event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    try {
      const { reply } = await addQuickReply(text);
      replies = [...(replies ?? []), reply];
      input.value = '';
      error.textContent = '';
      draw();
    } catch (failure) {
      error.textContent = errorMessage(failure);
    }
  }

  /** @param {QuickReply} reply */
  async function onDelete(reply) {
    if (!confirm(`למחוק את התשובה המהירה?\n\n${reply.text}`)) return;
    try {
      await deleteQuickReply(reply.id);
      replies = (replies ?? []).filter((r) => r.id !== reply.id);
      error.textContent = '';
      draw();
      toggle.focus();
    } catch (failure) {
      error.textContent = errorMessage(failure);
    }
  }

  return h('div', { class: 'quick-replies' }, toggle, panel);
}
