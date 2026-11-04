// Pure reconnect delay: exponential with jitter. Randomness is a parameter so tests can pin it.
import { RECONNECT_BASE_MS, RECONNECT_JITTER, RECONNECT_MAX_MS } from './constants.js';

/**
 * @param {number} attempt 0 for the first retry
 * @param {() => number} [random] returns [0, 1)
 * @returns {number} milliseconds
 */
export function reconnectDelay(attempt, random = Math.random) {
  const capped = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.max(0, attempt));
  const jitter = 1 - RECONNECT_JITTER + random() * RECONNECT_JITTER * 2;
  return Math.round(Math.min(RECONNECT_MAX_MS, capped * jitter));
}
