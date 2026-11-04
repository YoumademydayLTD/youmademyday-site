// The single source of truth for the thread list. Every view (inbox, tab badge, page title) reads it,
// and both the API and the live socket write to it.
import { request } from './api.js';
import { countUnreadThreads, upsertThread } from './threads.js';

/** @typedef {import('./threads.js').Thread} Thread */
/** @typedef {import('./threads.js').Message} Message */
/** @typedef {'open' | 'resolved' | 'all'} ThreadFilter */

/** @type {Map<number, Thread>} */
let threads = new Map();
/** @type {ThreadFilter} */
let filter = 'open';
let isLoaded = false;
/** @type {unknown} the last failed load, cleared by the next good one */
let loadError = null;

/** @type {Set<() => void>} */
const changeListeners = new Set();
/** @type {Set<(event: {thread: Thread, message: Message}) => void>} */
const messageListeners = new Set();

function notify() {
  changeListeners.forEach((fn) => fn());
}

export const inboxStore = {
  /** @returns {Thread[]} */
  all: () => [...threads.values()],
  /** @param {number} id */
  get: (id) => threads.get(id),
  filter: () => filter,
  isLoaded: () => isLoaded,
  loadError: () => loadError,
  unreadCount: () => countUnreadThreads(threads.values()),

  /** @param {() => void} fn */
  subscribe(fn) {
    changeListeners.add(fn);
    return () => changeListeners.delete(fn);
  },

  /** @param {(event: {thread: Thread, message: Message}) => void} fn */
  onMessage(fn) {
    messageListeners.add(fn);
    return () => messageListeners.delete(fn);
  },

  /** @param {ThreadFilter} value */
  setFilter(value) {
    filter = value;
    notify();
  },

  /** Loads every thread once; the filter is applied on the client so counts stay right on any filter. */
  async load() {
    try {
      const data = /** @type {{threads: Thread[]}} */ (await request('/api/admin/threads?status=all'));
      threads = new Map(data.threads.map((t) => [t.id, t]));
      isLoaded = true;
      loadError = null;
    } catch (error) {
      loadError = error;
      throw error;
    } finally {
      notify();
    }
  },

  /** @param {Thread} thread */
  put(thread) {
    threads = upsertThread(threads, thread);
    notify();
  },

  /**
   * A message arrived (live) or was sent (reply POST).
   * @param {{thread: Thread, message: Message}} event
   */
  receive(event) {
    threads = upsertThread(threads, event.thread);
    notify();
    messageListeners.forEach((fn) => fn(event));
  },

  /** The open thread was read on the server; mirror it at once so the badge drops without waiting. @param {number} id */
  markRead(id) {
    const thread = threads.get(id);
    if (!thread || !thread.unread) return;
    threads = upsertThread(threads, { ...thread, unread: 0 });
    notify();
  },

  reset() {
    threads = new Map();
    isLoaded = false;
    loadError = null;
    notify();
  },
};
