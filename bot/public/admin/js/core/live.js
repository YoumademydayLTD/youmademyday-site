// One WebSocket to /api/admin/live, reconnecting with backoff. No polling: data moves only on events.
// iOS Safari drops sockets in the background and events sent meanwhile are lost, so every (re)connect
// asks the caller to resync once.
import { reconnectDelay } from './backoff.js';

/** @typedef {'connecting' | 'live' | 'offline'} LiveStatus */

/**
 * @typedef {object} LiveOptions
 * @property {(data: unknown) => void} onEvent a parsed server event
 * @property {(isReconnect: boolean) => void} onConnected resync point
 * @property {(status: LiveStatus) => void} onStatus
 * @property {() => Promise<boolean>} isSignedIn checked after a failed connect (an expired cookie looks like close 1006)
 */

const LIVE_PATH = '/api/admin/live';

export function liveUrl() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}${LIVE_PATH}`;
}

/**
 * @param {LiveOptions} options
 * @returns {{stop: () => void}}
 */
export function connectLive(options) {
  /** @type {WebSocket | null} */
  let socket = null;
  let attempt = 0;
  let hasConnectedBefore = false;
  let isStopped = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let retryTimer;

  function open() {
    clearTimeout(retryTimer);
    if (isStopped || (socket && socket.readyState <= WebSocket.OPEN)) return;
    options.onStatus('connecting');
    const ws = new WebSocket(liveUrl());
    socket = ws;
    ws.addEventListener('open', () => {
      attempt = 0;
      options.onStatus('live');
      options.onConnected(hasConnectedBefore);
      hasConnectedBefore = true;
    });
    ws.addEventListener('message', (event) => handleMessage(event.data));
    ws.addEventListener('close', () => {
      if (socket === ws) socket = null;
      if (!isStopped) void scheduleRetry();
    });
  }

  /** @param {unknown} raw */
  function handleMessage(raw) {
    if (typeof raw !== 'string') return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      // A malformed frame is a server bug; report it and keep the socket, the next event may be fine.
      console.error('Live event is not JSON', error);
      return;
    }
    options.onEvent(data);
  }

  async function scheduleRetry() {
    options.onStatus('offline');
    if (attempt > 0) {
      let signedIn = true;
      try {
        signedIn = await options.isSignedIn();
      } catch (error) {
        console.error('Sign-in check failed; retrying the live connection anyway', error);
      }
      if (!signedIn) {
        stop();
        return;
      }
    }
    retryTimer = setTimeout(open, reconnectDelay(attempt));
    attempt += 1;
  }

  // Coming back to the tab or the network: reconnect now instead of waiting out the backoff.
  function wake() {
    if (document.visibilityState === 'visible' && !isStopped && !socket) {
      attempt = 0;
      open();
    }
  }

  function stop() {
    isStopped = true;
    clearTimeout(retryTimer);
    document.removeEventListener('visibilitychange', wake);
    removeEventListener('online', wake);
    socket?.close();
    socket = null;
  }

  document.addEventListener('visibilitychange', wake);
  addEventListener('online', wake);
  open();
  return { stop };
}
