// Hash routes: the Worker serves static files with no SPA fallback, so path routes would 404 on reload.
// Hashes also give the phone a working back gesture between inbox and thread.

/** @typedef {{view: 'inbox'} | {view: 'thread', threadId: number} | {view: 'content'}} Route */

/**
 * @param {string} hash e.g. "#/t/12"
 * @returns {Route}
 */
export function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 't' && /^\d+$/.test(parts[1] ?? '')) return { view: 'thread', threadId: Number(parts[1]) };
  if (parts[0] === 'content') return { view: 'content' };
  return { view: 'inbox' };
}

/**
 * @param {Route} route
 * @returns {string}
 */
export function routeHash(route) {
  if (route.view === 'thread') return `#/t/${route.threadId}`;
  if (route.view === 'content') return '#/content';
  return '#/inbox';
}

/**
 * @param {(route: Route) => void} listener
 * @returns {() => void} stop listening
 */
export function watchRoute(listener) {
  const handle = () => listener(parseRoute(location.hash));
  addEventListener('hashchange', handle);
  return () => removeEventListener('hashchange', handle);
}
