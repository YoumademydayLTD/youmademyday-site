// Customer card: profile, daily reminder settings, track progress, purchases and subscriptions.
// A side pane on wide screens, a sheet on the phone (the layout is CSS; this file only fills it).
import { request } from '../../core/api.js';
import { LANG_NAMES } from '../../core/constants.js';
import { h, replace } from '../../core/dom.js';
import { errorMessage, isAbort } from '../../core/errors.js';
import { formatHour, formatLongDate, formatMoney, initialOf } from '../../core/format.js';
import { icon } from '../../core/icons.js';
import { GOOD_STATUSES, PURCHASE_STATUS, SUBSCRIPTION_STATUS, statusLabel } from './user-card-labels.js';

/**
 * @typedef {{id: number, name: string, username: string | null, lang: string, createdAt: string, timeZone: string | null,
 *   dailyHour: number | null, dailyPaused: boolean, dailySilent: boolean, newsOptIn: boolean, track: string | null,
 *   trackDay: number | null, streak: number | null, isBlocked: boolean, ym: string | null}} UserCard
 * @typedef {{checkoutId: string, orderId: string | null, status: string, total: number, currency: string | null,
 *   items: {id: string, title: string}[], linkedAt: string}} Purchase
 * @typedef {{id: string, planId: string, status: string, currentPeriodEnd: string | null, cancelAtPeriodEnd: boolean}} Subscription
 * @typedef {{user: UserCard, purchases: Purchase[], subscriptions: Subscription[]}} UserCardData
 */

/** @param {boolean} value */
const yesNo = (value) => (value ? 'כן' : 'לא');

/**
 * @param {string} label
 * @param {string | number | Node | null | undefined} value
 */
function field(label, value) {
  return h('div', { class: 'kv' }, h('dt', null, label), h('dd', null, value ?? '—'));
}

/** @param {string} title @param {...unknown} content */
function section(title, ...content) {
  return h('section', { class: 'card-section' }, h('h3', null, title), ...content);
}

/** @param {string} status @param {Readonly<Record<string, string>>} table */
function statusTag(status, table) {
  return h('span', { class: GOOD_STATUSES.includes(status) ? 'tag tag-ok' : 'tag' }, statusLabel(table, status));
}

/** @param {Purchase} purchase */
function purchaseItem(purchase) {
  return h('li', { class: 'card-item' },
    h('div', { class: 'card-item-top' },
      h('span', { class: 'card-item-title', dir: 'auto' }, purchase.items.map((item) => item.title).join(', ') || 'ללא פריטים'),
      h('span', { class: 'num' }, formatMoney(purchase.total, purchase.currency))),
    h('div', { class: 'card-item-sub' }, statusTag(purchase.status, PURCHASE_STATUS), h('span', { class: 'muted small' }, formatLongDate(purchase.linkedAt))));
}

/** @param {Subscription} sub */
function subscriptionItem(sub) {
  const endLabel = sub.cancelAtPeriodEnd ? 'מסתיים ב־' : 'מתחדש ב־';
  return h('li', { class: 'card-item' },
    h('div', { class: 'card-item-top' }, h('span', { class: 'card-item-title', dir: 'ltr' }, sub.planId), statusTag(sub.status, SUBSCRIPTION_STATUS)),
    sub.currentPeriodEnd ? h('div', { class: 'muted small' }, endLabel, formatLongDate(sub.currentPeriodEnd)) : null);
}

/** @param {UserCardData} data */
function cardContent({ user, purchases, subscriptions }) {
  const langName = LANG_NAMES[/** @type {keyof typeof LANG_NAMES} */ (user.lang)] ?? user.lang;
  return [
    h('div', { class: 'card-hero' },
      h('span', { class: 'avatar avatar-lg', 'aria-hidden': 'true' }, initialOf(user.name)),
      h('h2', { id: 'card-title', dir: 'auto' }, user.name || 'ללא שם'),
      user.username ? h('a', { class: 'lnk-plain', dir: 'ltr', href: `https://t.me/${encodeURIComponent(user.username)}`, target: '_blank', rel: 'noopener' }, `@${user.username}`) : null,
      user.isBlocked ? h('span', { class: 'tag tag-danger' }, 'חסם את הבוט') : null),
    section('פרטים', h('dl', null,
      field('שפה', langName),
      field('הצטרף', formatLongDate(user.createdAt)),
      field('מספר לקוח', user.ym ? h('span', { dir: 'ltr', class: 'num' }, user.ym) : 'עוד לא קנה'),
      field('מזהה טלגרם', h('span', { dir: 'ltr', class: 'num' }, String(user.id))))),
    section('תזכורת יומית', h('dl', null,
      field('שעה', formatHour(user.dailyHour)),
      field('אזור זמן', user.timeZone ? h('span', { dir: 'ltr' }, user.timeZone) : '—'),
      field('מושהית', yesNo(user.dailyPaused)),
      field('שקטה (בלי צליל)', yesNo(user.dailySilent)),
      field('מקבל עדכונים', yesNo(user.newsOptIn)))),
    section('מסלול', h('dl', null,
      field('מסלול', user.track ? h('span', { dir: 'auto' }, user.track) : 'אין'),
      field('יום', user.trackDay ?? '—'),
      field('רצף', user.streak ?? '—'))),
    section(`רכישות (${purchases.length})`, purchases.length
      ? h('ul', { class: 'card-list' }, purchases.map(purchaseItem))
      : h('p', { class: 'muted small' }, 'אין רכישות.')),
    section(`מנויים (${subscriptions.length})`, subscriptions.length
      ? h('ul', { class: 'card-list' }, subscriptions.map(subscriptionItem))
      : h('p', { class: 'muted small' }, 'אין מנויים.')),
  ];
}

/**
 * @param {HTMLElement} pane
 * @param {{onClose: () => void}} options
 * @returns {{show: (telegramId: number) => void, clear: () => void, focusClose: () => void}}
 */
export function renderCardPane(pane, { onClose }) {
  /** @type {AbortController | null} */
  let loadAbort = null;
  /** @type {number | null} */
  let shownId = null;
  const closeButton = h('button', { type: 'button', class: 'icon-btn card-close', 'aria-label': 'סגירת פרטי הלקוח', onclick: onClose }, icon('close'));
  const body = h('div', { class: 'pane-scroll card-body' });
  replace(pane, h('div', { class: 'card-grip', 'aria-hidden': 'true' }), closeButton, body);

  /** @param {number} id */
  async function load(id) {
    loadAbort?.abort();
    const controller = new AbortController();
    loadAbort = controller;
    replace(body, h('p', { class: 'muted card-loading' }, 'טוען פרטים…'));
    try {
      const data = /** @type {UserCardData} */ (await request(`/api/admin/users/${id}`, { signal: controller.signal }));
      if (shownId === id) replace(body, cardContent(data));
    } catch (error) {
      if (isAbort(error) || shownId !== id) return;
      replace(body, h('p', { class: 'form-error', role: 'alert' }, `לא הצלחנו לטעון את פרטי הלקוח. ${errorMessage(error)}`));
    }
  }

  return {
    show(telegramId) {
      if (shownId === telegramId) return;
      shownId = telegramId;
      void load(telegramId);
    },
    clear() {
      shownId = null;
      loadAbort?.abort();
      body.replaceChildren();
    },
    focusClose() {
      closeButton.focus();
    },
  };
}
