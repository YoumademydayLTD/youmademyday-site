// Reply box: multi-line text, an optional photo with preview, Cmd/Ctrl+Enter to send.
import { COMPOSER_MAX_HEIGHT_PX } from '../../core/constants.js';
import { h, replace } from '../../core/dom.js';
import { errorMessage } from '../../core/errors.js';
import { icon } from '../../core/icons.js';

/**
 * @typedef {object} ComposerApi
 * @property {HTMLElement} el
 * @property {(text: string) => void} insertText puts text at the cursor
 * @property {() => void} reset clears text, photo and errors (a new thread was opened)
 */

/**
 * @param {{onSend: (reply: {text: string, photo: File | null}) => Promise<void>}} options
 * @returns {ComposerApi}
 */
export function createComposer({ onSend }) {
  /** @type {File | null} */
  let photo = null;
  /** @type {string | null} */
  let previewUrl = null;
  let isSending = false;

  const textarea = /** @type {HTMLTextAreaElement} */ (h('textarea', {
    id: 'composer-text', class: 'composer-text', rows: '1', dir: 'auto', placeholder: 'כתבו תשובה',
    'aria-describedby': 'composer-hint', oninput: onInput, onkeydown: onKeyDown,
  }));
  const fileInput = /** @type {HTMLInputElement} */ (h('input', {
    id: 'composer-photo', class: 'sr', type: 'file', accept: 'image/*', onchange: onPickPhoto,
  }));
  const sendButton = /** @type {HTMLButtonElement} */ (h('button', {
    type: 'submit', class: 'icon-btn send-btn', 'aria-label': 'שליחה', 'aria-keyshortcuts': 'Meta+Enter Control+Enter', disabled: true,
  }, icon('send')));
  const preview = h('div', { class: 'photo-preview', hidden: true });
  const error = h('p', { class: 'form-error', role: 'alert' });

  const el = h('form', { class: 'composer', onsubmit: onSubmit },
    preview,
    h('div', { class: 'composer-row' },
      h('label', { class: 'icon-btn', for: 'composer-photo', title: 'צירוף תמונה' }, icon('photo'), h('span', { class: 'sr' }, 'צירוף תמונה')),
      fileInput,
      h('label', { class: 'sr', for: 'composer-text' }, 'תשובה ללקוח'),
      textarea,
      sendButton),
    h('p', { id: 'composer-hint', class: 'sr' }, 'Enter לשורה חדשה, Cmd או Ctrl עם Enter לשליחה.'),
    error);

  function updateState() {
    sendButton.disabled = isSending || (!textarea.value.trim() && !photo);
  }

  function onInput() {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
    updateState();
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      el.requestSubmit();
    }
  }

  function onPickPhoto() {
    const file = fileInput.files?.[0] ?? null;
    fileInput.value = '';
    if (file && !file.type.startsWith('image/')) {
      error.textContent = 'אפשר לצרף רק תמונה.';
      return;
    }
    setPhoto(file);
  }

  /** @param {File | null} file */
  function setPhoto(file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    photo = file;
    previewUrl = file ? URL.createObjectURL(file) : null;
    preview.hidden = !file;
    if (file && previewUrl) {
      replace(preview,
        h('img', { src: previewUrl, alt: `תמונה לצירוף: ${file.name}` }),
        h('button', { type: 'button', class: 'icon-btn remove-photo', 'aria-label': 'הסרת התמונה', onclick: () => setPhoto(null) }, icon('close')));
    } else {
      preview.replaceChildren();
    }
    error.textContent = '';
    updateState();
  }

  /** @param {SubmitEvent} event */
  async function onSubmit(event) {
    event.preventDefault();
    const text = textarea.value.trim();
    if (isSending || (!text && !photo)) return;
    isSending = true;
    updateState();
    error.textContent = '';
    try {
      await onSend({ text, photo });
      textarea.value = '';
      setPhoto(null);
      onInput();
    } catch (failure) {
      error.textContent = `לא נשלח. ${errorMessage(failure)}`;
    } finally {
      isSending = false;
      updateState();
      textarea.focus();
    }
  }

  return {
    el,
    insertText(text) {
      const { selectionStart, selectionEnd, value } = textarea;
      textarea.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
      const caret = selectionStart + text.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
      onInput();
    },
    reset() {
      textarea.value = '';
      setPhoto(null);
      onInput();
    },
  };
}
