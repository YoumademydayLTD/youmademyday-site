// Plain-Hebrew sentences for API failures, so every screen explains a failure the same way.
import { ApiError } from './api.js';

/** By HTTP status (README "HTTP API" error codes). */
const BY_STATUS = Object.freeze({
  0: 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.',
  400: 'הבקשה לא תקינה. בדקו את השדות ונסו שוב.',
  401: 'צריך להתחבר מחדש.',
  403: 'אין הרשאה לפעולה הזו.',
  404: 'הפריט לא נמצא. ייתכן שנמחק.',
  413: 'הקובץ גדול מדי. נסו תמונה קטנה יותר.',
  429: 'יותר מדי ניסיונות. חכו רגע ונסו שוב.',
  502: 'טלגרם לא ענה. נסו שוב בעוד רגע.',
});
const FALLBACK = 'משהו השתבש בשרת. נסו שוב.';

/**
 * @param {unknown} error
 * @returns {string}
 */
export function errorMessage(error) {
  if (error instanceof ApiError) return BY_STATUS[/** @type {keyof typeof BY_STATUS} */ (error.status)] ?? FALLBACK;
  return FALLBACK;
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAbort(error) {
  return error instanceof DOMException && error.name === 'AbortError';
}
