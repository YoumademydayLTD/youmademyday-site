// The signed-in app: wires the shell, the panes, routes and the live socket together.
import { ApiError, request } from './core/api.js';
import { APP_TITLE } from './core/constants.js';
import { announce } from './core/dom.js';
import { inboxStore } from './core/inbox-store.js';
import { connectLive } from './core/live.js';
import { parseRoute, routeHash, watchRoute } from './core/router.js';
import { renderContent } from './features/content/content-view.js';
import { renderInbox } from './features/inbox/inbox-view.js';
import { createCustomerSearch } from './features/search/customer-search.js';
import { logout } from './features/login/login-api.js';
import { createShell } from './features/shell/shell.js';
import { renderThreadPane } from './features/thread/thread-view.js';
import { renderCardPane } from './features/user-card/user-card-view.js';

/** @typedef {import('./core/router.js').Route} Route */
/** @typedef {import('./core/threads.js').Thread} Thread */
/** @typedef {import('./core/threads.js').Message} Message */

/**
 * Live events (README: `{type:"message", thread, message}` and `{type:"thread", thread}`).
 * @param {unknown} data
 */
function handleLiveEvent(data) {
  if (!data || typeof data !== 'object' || !('type' in data)) return;
  const event = /** @type {{type: string, thread?: Thread, message?: Message}} */ (data);
  if (event.type === 'message' && event.thread && event.message) {
    inboxStore.receive({ thread: event.thread, message: event.message });
    if (event.message.direction === 'in') announce(`הודעה חדשה מ־${event.thread.user.name || 'לקוח'}`);
  } else if (event.type === 'thread' && event.thread) {
    inboxStore.put(event.thread);
  }
}

/** @returns {Promise<boolean>} */
async function isSignedIn() {
  try {
    await request('/api/admin/me');
    return true;
  } catch (error) {
    // A 401 already sent the app to the sign-in screen (api.onUnauthorized); other failures are network blips.
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

/**
 * @param {HTMLElement} root
 * @param {{onSignedOut: () => void}} options
 * @returns {() => void} teardown
 */
export function startApp(root, { onSignedOut }) {
  const shell = createShell(root, { onLogout: () => void signOut() });
  const search = createCustomerSearch({ onOpen: openCustomer });
  const inbox = renderInbox(shell.panes.inbox, { search });
  const thread = renderThreadPane(shell.panes.thread, { onToggleCard: () => setCard(!shell.isCardOpen()) });
  const card = renderCardPane(shell.panes.card, { onClose: () => setCard(false) });
  /** @type {ReturnType<typeof renderContent> | null} */
  let content = null;
  /** @type {number | null} */
  let openThreadId = null;

  /** @param {boolean} isOpen */
  function setCard(isOpen) {
    shell.setCardOpen(isOpen);
    thread.setCardExpanded(isOpen);
    if (!shell.isCardSheet()) return;
    if (isOpen) card.focusClose();
    else document.querySelector(/** @type {'button'} */ ('button.card-toggle'))?.focus();
  }

  /**
   * A search result: their latest thread (the card follows), or only the card for someone who never wrote.
   * @param {import('./features/search/customer-search.js').CustomerHit} hit
   */
  function openCustomer(hit) {
    if (hit.threadId !== null) { location.hash = routeHash({ view: 'thread', threadId: hit.threadId }); return; }
    card.show(hit.id);
    setCard(true);
  }

  /** @param {Route} route */
  function show(route) {
    if (route.view === 'content') {
      content ??= renderContent(shell.panes.content);
      content.refresh();
    }
    if (route.view === 'thread') {
      openThreadId = route.threadId;
      thread.open(route.threadId);
      const user = inboxStore.get(route.threadId)?.user;
      if (user) card.show(user.id);
    } else if (route.view === 'inbox') {
      openThreadId = null;
      thread.close();
      card.clear();
    }
    if (route.view !== 'thread' && shell.isCardOpen()) shell.setCardOpen(false);
    shell.setView(route.view);
    inbox.setSelected(openThreadId);
  }

  function onStoreChange() {
    const unread = inboxStore.unreadCount();
    shell.setUnread(unread);
    document.title = unread ? `(${unread}) ${APP_TITLE}` : APP_TITLE;
    // A thread opened from a link before the list arrived gets its card once the user is known.
    const user = openThreadId === null ? undefined : inboxStore.get(openThreadId)?.user;
    if (user) card.show(user.id);
  }

  async function resync() {
    try {
      await inboxStore.load();
    } catch (error) {
      console.error('Inbox resync failed', error);
    }
    thread.resync();
  }

  /** Back from the background (iOS may have kept a dead socket): fetch once, no polling. */
  function onVisible() {
    if (document.visibilityState === 'visible') void resync();
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    if (event.key === 'Escape' && shell.isCardOpen() && shell.isCardSheet()) setCard(false);
  }

  const unsubscribe = inboxStore.subscribe(onStoreChange);
  const stopRoutes = watchRoute(show);
  shell.scrim.addEventListener('click', () => setCard(false));
  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('keydown', onKey);
  const live = connectLive({
    onEvent: handleLiveEvent,
    onConnected: (isReconnect) => { if (isReconnect) void resync(); },
    onStatus: shell.setLive,
    isSignedIn,
  });

  // A failure is shown in the inbox pane (inboxStore.loadError) with a retry button.
  inboxStore.load().catch((error) => console.error('Inbox load failed', error));
  show(parseRoute(location.hash));
  onStoreChange();

  function teardown() {
    live.stop();
    stopRoutes();
    unsubscribe();
    inbox.destroy();
    thread.destroy();
    card.clear();
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('keydown', onKey);
    inboxStore.reset();
    document.title = APP_TITLE;
  }

  async function signOut() {
    try {
      await logout();
    } catch (error) {
      // Leaving the screen is still right; the cookie dies on its own when the session ends.
      console.error('Logout call failed', error);
    }
    onSignedOut(); // the caller runs teardown when it switches screens
  }

  return teardown;
}
