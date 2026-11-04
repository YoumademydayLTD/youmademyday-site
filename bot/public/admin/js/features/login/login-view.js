// Sign-in screen: a real Telegram deep link (created on render) plus a 6-digit code from /login in the bot.
import { ApiError } from '../../core/api.js';
import { LOGIN_CODE_LENGTH, LOGIN_REFRESH_MARGIN_MS, MS_PER_SECOND } from '../../core/constants.js';
import { h } from '../../core/dom.js';
import { errorMessage, isAbort } from '../../core/errors.js';
import { brandMark } from '../shell/brand-mark.js';
import { startLogin, verifyCode, waitLogin } from './login-api.js';

// Isolated left-to-right, or the slash jumps to the wrong end inside Hebrew text («login/»).
const LOGIN_COMMAND = '\u2066/login\u2069';
const NOT_ADMIN = 'חשבון הטלגרם הזה אינו חשבון המנהל. התחברו מהחשבון של בעל החנות.';
const WRONG_CODE = `הקוד שגוי או שפג תוקפו. שלחו ${LOGIN_COMMAND} לבוט וקבלו קוד חדש.`;
const LINK_EXPIRED = 'הקישור פג. לחצו שוב על הכפתור.';
const WAITING = 'מחכים לאישור בטלגרם…';

/**
 * @param {unknown} error
 * @param {string} unauthorizedText what a 401 means on this call
 */
function loginErrorText(error, unauthorizedText) {
  if (error instanceof ApiError && error.status === 403) return NOT_ADMIN;
  if (error instanceof ApiError && error.status === 401) return unauthorizedText;
  return errorMessage(error);
}

/** Resolves once the page is visible again (iOS suspends fetches while Telegram is in front). */
function whenVisible() {
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve(undefined);
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

/**
 * @param {HTMLElement} root
 * @param {{onSignedIn: () => void}} options
 * @returns {() => void} cleanup
 */
export function renderLogin(root, { onSignedIn }) {
  /** @type {AbortController | null} */
  let waitAbort = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let refreshTimer;
  let token = '';
  let isDone = false;

  const status = h('p', { class: 'login-status', role: 'status', 'aria-live': 'polite' });
  const tgLink = h('a', {
    class: 'btn btn-tg btn-block', target: '_blank', rel: 'noopener', 'aria-disabled': 'true',
    onclick: (/** @type {MouseEvent} */ e) => (token ? startWaiting() : e.preventDefault()),
  }, 'כניסה עם טלגרם');
  const codeInput = h('input', {
    id: 'login-code', class: 'field code-field', inputmode: 'numeric', autocomplete: 'one-time-code',
    pattern: `\\d{${LOGIN_CODE_LENGTH}}`, maxlength: String(LOGIN_CODE_LENGTH), required: true, dir: 'ltr',
    'aria-describedby': 'login-code-hint',
  });
  const codeButton = h('button', { class: 'btn btn-ink', type: 'submit' }, 'כניסה');
  const form = h('form', { class: 'code-form', novalidate: true, onsubmit: submitCode },
    h('label', { for: 'login-code' }, 'קוד מהבוט'),
    h('p', { id: 'login-code-hint', class: 'muted small' }, `שלחו ${LOGIN_COMMAND} לבוט וקבלו קוד בן ${LOGIN_CODE_LENGTH} ספרות.`),
    h('div', { class: 'code-row' }, codeInput, codeButton));

  root.replaceChildren(h('main', { class: 'login', id: 'main' },
    h('section', { class: 'login-card', 'aria-labelledby': 'login-title' },
      brandMark(),
      h('h1', { id: 'login-title' }, 'מרכז התמיכה'),
      h('p', { class: 'muted' }, 'כניסה לבעל החנות בלבד.'),
      tgLink,
      h('div', { class: 'or', role: 'separator' }, h('span', null, 'או')),
      form,
      status)));

  /** @param {string} text @param {boolean} [isError] */
  function say(text, isError = false) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  }

  async function createToken() {
    tgLink.setAttribute('aria-disabled', 'true');
    try {
      const start = await startLogin();
      if (isDone) return;
      token = start.token;
      tgLink.setAttribute('href', start.deepLink);
      tgLink.removeAttribute('aria-disabled');
      clearTimeout(refreshTimer);
      const refreshIn = start.expiresAt * MS_PER_SECOND - Date.now() - LOGIN_REFRESH_MARGIN_MS;
      refreshTimer = setTimeout(() => void createToken(), Math.max(0, refreshIn));
    } catch (error) {
      token = '';
      tgLink.removeAttribute('href');
      say(loginErrorText(error, errorMessage(error)), true);
    }
  }

  function startWaiting() {
    waitAbort?.abort();
    waitAbort = new AbortController();
    say(WAITING);
    void waitLoop(token, waitAbort.signal);
  }

  /** @param {string} waitToken @param {AbortSignal} signal */
  async function waitLoop(waitToken, signal) {
    while (!signal.aborted) {
      try {
        const reply = await waitLogin(waitToken, signal);
        if (reply.status === 'ok') return finish();
        if (reply.status === 'expired') {
          say(LINK_EXPIRED);
          await createToken();
          return;
        }
      } catch (error) {
        if (isAbort(error)) return;
        // The phone was in Telegram and Safari dropped the request: carry on once we are back.
        if (error instanceof ApiError && error.status === 0 && document.visibilityState !== 'visible') {
          await whenVisible();
          continue;
        }
        say(loginErrorText(error, LINK_EXPIRED), true);
        return;
      }
    }
  }

  /** @param {SubmitEvent} event */
  async function submitCode(event) {
    event.preventDefault();
    const code = codeInput.value.replace(/\D/g, '');
    if (code.length !== LOGIN_CODE_LENGTH) {
      codeInput.setAttribute('aria-invalid', 'true');
      say(`הקוד צריך להיות ${LOGIN_CODE_LENGTH} ספרות.`, true);
      codeInput.focus();
      return;
    }
    codeInput.removeAttribute('aria-invalid');
    codeButton.disabled = true;
    try {
      await verifyCode(code);
      finish();
    } catch (error) {
      codeInput.setAttribute('aria-invalid', 'true');
      say(loginErrorText(error, WRONG_CODE), true);
    } finally {
      codeButton.disabled = false;
    }
  }

  function cleanup() {
    isDone = true;
    waitAbort?.abort();
    clearTimeout(refreshTimer);
  }

  function finish() {
    cleanup();
    onSignedIn();
  }

  void createToken();
  return cleanup;
}
