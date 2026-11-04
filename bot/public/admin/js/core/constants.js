// Shared values for the support center. Kept in one place so screens never hard-code them.

export const APP_TITLE = 'מרכז התמיכה · You Made My Day';
export const LOCALE = 'he-IL';

/** The languages the bot speaks (README "Site sign-in": user.lang is he/en/fr/ar/ru). */
export const LANGS = Object.freeze(['he', 'en', 'fr', 'ar', 'ru']);
export const LANG_NAMES = Object.freeze({ he: 'עברית', en: 'English', fr: 'Français', ar: 'العربية', ru: 'Русский' });
/** Right-to-left scripts among LANGS, for text areas whose language is known in advance. */
export const RTL_LANGS = Object.freeze(['he', 'ar']);

export const THREAD_FILTERS = Object.freeze([
  { value: 'open', label: 'פתוחות' },
  { value: 'resolved', label: 'טופלו' },
  { value: 'all', label: 'הכל' },
]);

export const MEDIA_LABELS = Object.freeze({
  photo: 'תמונה',
  document: 'קובץ',
  voice: 'הודעה קולית',
  video: 'וידאו',
  sticker: 'מדבקה',
});

/** WebSocket reconnect backoff: doubles from BASE up to MAX, with jitter so many tabs don't reconnect in lockstep. */
export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const RECONNECT_JITTER = 0.3;

/** An incoming message on the open thread marks it read on the server; bursts are merged. */
export const MARK_READ_DEBOUNCE_MS = 800;

export const LOGIN_CODE_LENGTH = 6;
/** The login token is refreshed this long before it expires, so the link is never dead when tapped. */
export const LOGIN_REFRESH_MARGIN_MS = 10000;

/** The composer grows with its text up to this height, then scrolls inside. */
export const COMPOSER_MAX_HEIGHT_PX = 180;
/** Content list previews are cut to this many characters. */
export const PREVIEW_CHARS = 160;

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const DAYS_PER_WEEK = 7;
