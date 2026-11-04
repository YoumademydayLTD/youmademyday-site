// Pure thread and message list logic (no DOM): ordering, filtering, merging live events.

/**
 * @typedef {{id: number, name: string, username: string | null, lang: string}} ThreadUser
 * @typedef {{id: number, status: 'open' | 'resolved', unread: number | boolean, lastText: string | null,
 *   lastAt: string, createdAt: string, user: ThreadUser}} Thread
 * @typedef {null | 'photo' | 'document' | 'voice' | 'video' | 'sticker'} MediaKind
 * @typedef {{id: number, threadId: number, direction: 'in' | 'out', text: string | null, mediaKind: MediaKind,
 *   fileId: string | null, fileName: string | null, createdAt: string}} Message
 */

/**
 * The contract does not say whether `unread` is a count or a flag; both read as a number.
 * @param {number | boolean | null | undefined} unread
 */
export function unreadOf(unread) {
  const n = Number(unread);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Unread first, then the newest conversation (README: same order as the server).
 * @param {readonly Thread[]} threads
 * @returns {Thread[]}
 */
export function sortThreads(threads) {
  return [...threads].sort((a, b) => {
    const unreadFirst = Number(unreadOf(b.unread) > 0) - Number(unreadOf(a.unread) > 0);
    return unreadFirst || Date.parse(b.lastAt) - Date.parse(a.lastAt);
  });
}

/**
 * @param {readonly Thread[]} threads
 * @param {'open' | 'resolved' | 'all'} status
 */
export function filterThreads(threads, status) {
  return status === 'all' ? [...threads] : threads.filter((t) => t.status === status);
}

/**
 * How many threads wait for an answer (the number on the tab and in the page title).
 * @param {Iterable<Thread>} threads
 */
export function countUnreadThreads(threads) {
  let count = 0;
  for (const t of threads) if (unreadOf(t.unread) > 0) count += 1;
  return count;
}

/**
 * Adds or replaces a thread; returns a new map.
 * @param {ReadonlyMap<number, Thread>} map
 * @param {Thread} thread
 * @returns {Map<number, Thread>}
 */
export function upsertThread(map, thread) {
  const next = new Map(map);
  next.set(thread.id, thread);
  return next;
}

/**
 * Adds a message once. The reply POST and the live socket can both deliver the same message.
 * @param {readonly Message[]} messages
 * @param {Message} message
 * @returns {Message[]}
 */
export function addMessage(messages, message) {
  if (messages.some((m) => m.id === message.id)) return [...messages];
  return [...messages, message].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
}

/**
 * Inbox preview line: the text, or the media label when a message has no text.
 * @param {string | null} lastText
 * @param {string} mediaFallback
 */
export function previewOf(lastText, mediaFallback) {
  const text = (lastText ?? '').replace(/\s+/g, ' ').trim();
  return text || mediaFallback;
}
