// Unit tests for the DOM-free support-center modules (public/admin). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = new URL('../../public/admin/js/core', import.meta.url).href;
const { formatListTime, formatMoney, formatHour, initialOf, truncate, formatDayLabel, isSameDay } = await import(`${BASE}/format.js`);
const { sortThreads, filterThreads, countUnreadThreads, upsertThread, addMessage, unreadOf, previewOf } = await import(`${BASE}/threads.js`);
const { reconnectDelay } = await import(`${BASE}/backoff.js`);
const { parseRoute, routeHash } = await import(`${BASE}/router.js`);

const TZ = 'Asia/Jerusalem';
const NOW = Date.parse('2026-11-04T12:00:00Z'); // 14:00 in Jerusalem
const clock = { now: NOW, timeZone: TZ };
const iso = (ms) => new Date(ms).toISOString();

test('formatListTime: now, minutes, today, yesterday, weekday, date', () => {
  assert.equal(formatListTime(iso(NOW - 20_000), clock), 'עכשיו');
  assert.equal(formatListTime(iso(NOW - 5 * 60_000), clock), 'לפני 5 דק׳');
  assert.equal(formatListTime('2026-11-04T06:30:00Z', clock), '08:30');
  assert.equal(formatListTime('2026-11-03T10:00:00Z', clock), 'אתמול');
  assert.match(formatListTime('2026-11-01T10:00:00Z', clock), /יום/);
  assert.equal(formatListTime('2026-09-01T10:00:00Z', clock), '1.9.26');
  assert.equal(formatListTime('garbage', clock), '');
});

test('formatListTime: day boundary follows the time zone, not UTC', () => {
  // 22:30Z on the 3rd is 00:30 on the 4th in Jerusalem: today, not yesterday.
  assert.equal(formatListTime('2026-11-03T22:30:00Z', clock), '00:30');
});

test('formatDayLabel and isSameDay', () => {
  assert.equal(formatDayLabel(iso(NOW), clock), 'היום');
  assert.equal(formatDayLabel('2026-11-03T08:00:00Z', clock), 'אתמול');
  assert.ok(isSameDay('2026-11-03T22:30:00Z', '2026-11-04T10:00:00Z', TZ));
  assert.ok(!isSameDay('2026-11-03T21:30:00Z', '2026-11-03T22:30:00Z', TZ));
});

test('formatMoney uses the currency exponent', () => {
  assert.match(formatMoney(12900, 'ILS'), /129\.00/);
  assert.match(formatMoney(1500, 'JPY'), /1,500/);
  assert.match(formatMoney(1500, 'JPY'), /¥|JP¥/);
  assert.equal(formatMoney(500, null), '500');
  assert.equal(formatMoney(0, 'ILS').includes('0.00'), true);
  assert.equal(formatMoney(1000, 'NOTACODE'), '1,000 NOTACODE');
});

test('formatHour, initialOf, truncate', () => {
  assert.equal(formatHour(8), '08:00');
  assert.equal(formatHour(null), '—');
  assert.equal(initialOf('דנה'), 'ד');
  assert.equal(initialOf('emily'), 'E');
  assert.equal(initialOf('👩‍👧 mom'), '👩‍👧');
  assert.equal(initialOf(''), '?');
  assert.equal(truncate('abc', 5), 'abc');
  assert.equal(truncate('abcdef', 3), 'abc…');
});

const t = (id, unread, lastAt, status = 'open') => ({ id, status, unread, lastText: '', lastAt, createdAt: lastAt, user: { id, name: '', username: null, lang: 'he' } });

test('sortThreads: unread first, then newest', () => {
  const list = [t(1, 0, '2026-11-04T10:00:00Z'), t(2, 1, '2026-11-01T10:00:00Z'), t(3, 0, '2026-11-04T11:00:00Z'), t(4, true, '2026-11-02T10:00:00Z')];
  assert.deepEqual(sortThreads(list).map((x) => x.id), [4, 2, 3, 1]);
});

test('unreadOf accepts counts and flags', () => {
  assert.equal(unreadOf(3), 3);
  assert.equal(unreadOf(true), 1);
  assert.equal(unreadOf(false), 0);
  assert.equal(unreadOf(null), 0);
  assert.equal(unreadOf(-1), 0);
});

test('filterThreads, countUnreadThreads, upsertThread', () => {
  const list = [t(1, 2, 'x'), t(2, 0, 'x', 'resolved'), t(3, true, 'x')];
  assert.deepEqual(filterThreads(list, 'resolved').map((x) => x.id), [2]);
  assert.equal(filterThreads(list, 'all').length, 3);
  assert.equal(countUnreadThreads(list), 2);
  const map = new Map([[1, list[0]]]);
  const next = upsertThread(map, { ...list[0], unread: 0 });
  assert.notEqual(next, map);
  assert.equal(map.get(1).unread, 2);
  assert.equal(next.get(1).unread, 0);
});

test('addMessage dedupes by id and keeps time order', () => {
  const m = (id, at) => ({ id, threadId: 1, direction: 'in', text: '', mediaKind: null, fileId: null, fileName: null, createdAt: at });
  let list = [m(1, '2026-11-04T10:00:00Z')];
  list = addMessage(list, m(3, '2026-11-04T12:00:00Z'));
  list = addMessage(list, m(2, '2026-11-04T11:00:00Z'));
  list = addMessage(list, m(3, '2026-11-04T12:00:00Z'));
  assert.deepEqual(list.map((x) => x.id), [1, 2, 3]);
});

test('previewOf', () => {
  assert.equal(previewOf('  a\n\nb ', 'מדיה'), 'a b');
  assert.equal(previewOf(null, 'מדיה'), 'מדיה');
  assert.equal(previewOf('   ', 'מדיה'), 'מדיה');
});

test('reconnectDelay grows, caps and jitters', () => {
  const mid = () => 0.5;
  assert.equal(reconnectDelay(0, mid), 1000);
  assert.equal(reconnectDelay(3, mid), 8000);
  assert.equal(reconnectDelay(20, mid), 30000);
  assert.equal(reconnectDelay(0, () => 0), 700);
  assert.ok(reconnectDelay(20, () => 0.999) <= 30000);
  assert.equal(reconnectDelay(-2, mid), 1000);
});

test('parseRoute / routeHash round trip', () => {
  assert.deepEqual(parseRoute(''), { view: 'inbox' });
  assert.deepEqual(parseRoute('#/t/12'), { view: 'thread', threadId: 12 });
  assert.deepEqual(parseRoute('#/t/abc'), { view: 'inbox' });
  assert.deepEqual(parseRoute('#/content'), { view: 'content' });
  for (const route of [{ view: 'inbox' }, { view: 'thread', threadId: 5 }, { view: 'content' }]) assert.deepEqual(parseRoute(routeHash(route)), route);
});
