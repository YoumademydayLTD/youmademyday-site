// Entry point: ask the server who we are, then show the app or the sign-in screen.
// Any 401 later (expired cookie) brings the sign-in screen back.
import { ApiError, onUnauthorized } from './core/api.js';
import { h, replace } from './core/dom.js';
import { errorMessage } from './core/errors.js';
import { startApp } from './app.js';
import { fetchAdmin } from './features/login/login-api.js';
import { renderLogin } from './features/login/login-view.js';

const root = /** @type {HTMLElement} */ (document.getElementById('root'));

/** @type {(() => void) | null} tears down whichever screen is showing */
let teardown = null;
/** @type {'none' | 'login' | 'app' | 'error'} */
let screen = 'none';

/**
 * @param {'login' | 'app' | 'error'} next
 * @param {() => () => void} render
 */
function switchScreen(next, render) {
  teardown?.();
  screen = next;
  teardown = render();
}

function showLogin() {
  // Several calls can fail with 401 at once when the cookie expires; one sign-in screen is enough.
  if (screen === 'login') return;
  switchScreen('login', () => renderLogin(root, { onSignedIn: () => void boot() }));
}

function showApp() {
  switchScreen('app', () => startApp(root, { onSignedOut: showLogin }));
}

/** @param {unknown} error */
function showBootError(error) {
  switchScreen('error', () => {
    replace(root, h('main', { class: 'login', id: 'main' },
      h('section', { class: 'login-card', role: 'alert' },
        h('h1', null, 'מרכז התמיכה'),
        h('p', null, errorMessage(error)),
        h('button', { type: 'button', class: 'btn btn-ink', onclick: () => void boot() }, 'נסו שוב'))));
    return () => {};
  });
}

async function boot() {
  try {
    await fetchAdmin();
    showApp();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) showLogin();
    else showBootError(error);
  }
}

onUnauthorized(showLogin);

void boot();
