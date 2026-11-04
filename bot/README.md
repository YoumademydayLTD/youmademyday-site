# ymd-bot — the store's Telegram bot and support center

Cloudflare Worker behind **@youmademydaystore_bot**, live at **https://ymd-bot.crx-platform-website.workers.dev**.
It also serves the owner's support center at **/admin** (Hebrew, RTL, works on iPhone).

## What it does

- **/start payloads** from the site: `home`, `support`, `login-<token>` (confirm sign-in with a button), `plan-<id>`
  (`plan-spark` joins the free morning track; paid plans point to the site), `order-<checkout id>` (from the thanks page:
  links the paid order to this Telegram user — first link wins — and sends the PDFs as documents straight from R2;
  if a document fails, buttons with the store's signed download links; a still-pending payment is delivered by the cron).
- **Commands** (per language): start, library, plans, reminders, support, login, settings, terms, privacy, delete, plus
  the hidden `/admin <code>`.
- **Daily messages**: `bot_content` rows per track/day/language; users pick the hour and time zone, pause or mute.
  Buttons «✓ done» (streak), «remind me tonight» (re-sent at 20:00 local), and the lesson link when the day has one.
  Spark is free; the topic tracks need an active subscription row (written by the store worker).
- **Reminder before each membership charge**, 24 h ahead, from the store's `subscriptions` table.
- **Support**: any free text, photo or file from a customer goes into their thread, gets one auto-ack per thread, is
  pushed live to /admin and announced to the admin in Telegram. Replying to that notice in Telegram answers the customer.
- **/delete**: removes every `bot_*` row of the user; store order and payment rows stay (law), only unlinked. An active
  membership is announced to the admin to end without further charges.

## Architecture

```
Telegram ──webhook──▶ /telegram/webhook ─▶ bot/dispatch ─▶ features (start, login, library, daily, settings, support, privacy)
site (youmademyday.store) ──CORS──▶ /api/login/*, /api/me, /api/logout
/admin (static, public/admin) ──cookie──▶ /api/admin/*  ◀──WebSocket── AdminHub (Durable Object, hibernation)
cron */15 ─▶ daily queue · charge reminders · pending orders · paced outbox drain · cleanup
D1 "ymd-store": store tables read-only + bot_* tables · R2 "ymd-files" · service binding STORE → ymd-store /api/downloads
```

- `src/<feature>/` holds each area; pure rules (`start/payload`, `login/lifecycle`, `daily/clock`, `daily/streak`,
  `outbox/pacer`, `support/routing`, `admin/guard`, `webhook/secret`) are unit-tested in `test/`.
- Updates are handled once (`bot_updates` dedupe on `update_id`), answered 200 at once and processed in `waitUntil`.
- The outbox drain keeps to 25 msg/s overall and 1 msg/s per chat, waits out a 429 `retry_after`, marks users who
  blocked the bot, and retries other failures up to 5 times.
- What an order delivers comes from the store worker (`GET /api/downloads` over the service binding). The R2 key rule
  `<lang>/<id>.pdf` and the catalogue JSON (plan prices, titles) are read from `worker/src` as data at deploy time:
  **redeploy the bot after a price or catalogue change**.
- Own migrations in `migrations/`, tracked in `bot_migrations` (not the store's `d1_migrations`).

## Store ↔ bot

- `POST /api/internal/orders/paid {checkoutId, telegramId}` (from the store, header `X-Internal-Secret`): a signed-in
  buyer's order was paid; it is linked to them and the files are sent at once (the cron retries a failed send).
- Memberships: the ✨ menu button opens the bot's plans screen, which lists the user's running memberships with a
  cancel button (`sub:ask:<id>` → confirm → the store's `POST /api/internal/subscriptions/cancel`). `/delete` cancels
  running memberships the same way and tells the admin only about one that could not be cancelled.
- The user card shows the internal customer number (`ym` from the store's `customers` table); the inbox has a customer
  search: `GET /api/admin/customers?q=` (ym number, name, @username or Telegram id) → `{results: [{id, name, username, ym, threadId}]}`.

## Daily companion on the site

With the site session (Bearer): `GET /api/companion` → `{track, tracks: [{id, isFree, canJoin}], today: {dayN, text,
lessonUrl, lessonLabel} | null, history: [{dayN, text}], streak, doneToday, settings: {dailyHour, timeZone, paused, silent}}`;
`POST /api/companion/done`, `POST /api/companion/settings {dailyHour?, paused?, silent?}`, `POST /api/companion/track {track}`.
It uses the same `bot_users` row as the bot, so the streak, track and reminder settings are one.

## Secrets (values in `Site/.env.bot`, gitignored; never printed)

| Name | What |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | the bot's token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | sent by Telegram in `X-Telegram-Bot-Api-Secret-Token` (made by `tools/make_secrets.ts`) |
| `ADMIN_CLAIM_CODE` | one-time code for `/admin <code>` (made by `tools/make_secrets.ts`) |
| `YMD_INTERNAL_SECRET` | shared with the store worker (value in `Site/.env`) |

Put one: `grep '^NAME=' ../.env.bot | cut -d= -f2- | tr -d '\n' | npx wrangler secret put NAME`

Variables in `wrangler.jsonc`: `SITE_URL`, `STORE_URL`, `PUBLIC_URL`, `EXTRA_ORIGINS`, `BOT_USERNAME`.

## Deploy

Run `~/.claude/bin/load-check` first on the shared Mac.

```sh
cd bot && npm install
npx wrangler d1 migrations list ymd-store --remote   # only bot_* files should be listed
npm run db:migrate
npm run deploy                                       # typecheck + tests + wrangler deploy
node tools/make_secrets.ts                           # once; then put the three secrets (above)
node tools/setup_telegram.ts --photo                 # names, descriptions, commands, menu, photo, webhook
```

`setup_telegram.ts` is safe to re-run (drop `--photo` to keep the current picture; the picture is
`brand/bot-avatar.jpg`, drawn from `brand/bot-avatar.html`).

## The owner claims the support center (once)

1. In Telegram, open @youmademydaystore_bot and send `/admin <code>` with the `ADMIN_CLAIM_CODE` value from `Site/.env.bot`.
2. The bot answers that you are the support admin. The code then stops working for anyone.
3. Open https://ymd-bot.crx-platform-website.workers.dev/admin/ and sign in with Telegram (or with a `/login` code).

New customer messages arrive in that chat with a button to the thread; reply to the notice to answer from Telegram.

## Decisions (ADR)

- **04.11.2026 — A separate bot worker on the store's database.** The bot owns only `bot_*` tables and reads the store
  tables; delivery details stay in the store worker (service binding), so there is one source of truth for what an
  order gives. Sign-in sessions are random tokens stored hashed; the site keeps its token in `localStorage["ymd-session"]`,
  the support center an HttpOnly cookie. Live updates use one Durable Object WebSocket hub, never polling.
  Time zone default Asia/Jerusalem (French: Europe/Paris), language from Telegram, English by default (owner).

## HTTP API

Errors are JSON `{error, message}` with codes `bad_request` 400, `unauthorized` 401, `forbidden` 403, `not_found` 404,
`payload_too_large` 413, `too_many_requests` 429, `upstream_error` 502, `internal` 500.

### Site sign-in (browser, CORS: `https://youmademyday.store`, `http://127.0.0.1:4322`)

The site keeps the session token in `localStorage["ymd-session"]` and sends it as `Authorization: Bearer <session>`.

| Method + path | Body | Reply |
| --- | --- | --- |
| `POST /api/login/start` | `{}` | `{token, deepLink, expiresAt}` — `deepLink` is `https://t.me/youmademydaystore_bot?start=login-<token>`, valid 5 minutes (`expiresAt` unix seconds) |
| `POST /api/login/wait` | `{token}` | Long-poll, answers within ~20 s: `{status:"pending"}`, `{status:"expired"}` or `{status:"ok", session, user}` once the user tapped «confirm» in the bot. Call again while `pending`. |
| `POST /api/login/verify` | `{code}` (6 digits from `/login` in the bot) | `{status:"ok", session, user}`; wrong or expired code → 401; too many wrong codes from one client → 429 |
| `GET /api/me` | — (Bearer) | `{user}` or 401 |
| `POST /api/logout` | — (Bearer) | `{ok:true}` |

`user` is `{id, name, username, lang}` (`username` may be null; `lang` is he/en/fr/ar/ru). Sessions last 30 days.

### Support center (same origin, cookie `ymd_admin`: HttpOnly, Secure, SameSite=Strict)

Sign-in works like the site's but only for the admin's Telegram id:
`POST /api/admin/login/start`, `POST /api/admin/login/wait {token}`, `POST /api/admin/login/verify {code}` (replies as above
without `session`; the cookie is set instead; a Telegram account that is not the admin → 403). `GET /api/admin/me` → `{admin:{id,name}}`
or 401. `POST /api/admin/logout`.

| Method + path | Body | Reply |
| --- | --- | --- |
| `GET /api/admin/threads?status=open\|resolved\|all` | — | `{threads: Thread[]}`, unread first, then newest |
| `GET /api/admin/threads/:id` | — | `{thread: Thread, messages: Message[]}`; marks the thread read |
| `POST /api/admin/threads/:id/reply` | JSON `{text}` or multipart `text` + `photo` (image file) | `{message: Message, thread: Thread}` |
| `POST /api/admin/threads/:id/read` | — | `{thread: Thread}`; marks the thread read (the open thread got a new message) |
| `POST /api/admin/threads/:id/status` | `{status:"open"\|"resolved"}` | `{thread: Thread}` |
| `GET /api/admin/users/:telegramId` | — | `{user: UserCard, purchases: Purchase[], subscriptions: Subscription[]}` |
| `GET /api/admin/quick-replies` | — | `{replies: [{id, text}]}` |
| `POST /api/admin/quick-replies` | `{text}` | `{reply: {id, text}}` |
| `POST /api/admin/quick-replies/:id/delete` | — | `{ok:true}` |
| `GET /api/admin/content?track=<id>&lang=<code>` | — | `{tracks: [{id, access, isFree}], langs: string[], items: ContentItem[]}` (filters optional) |
| `POST /api/admin/content` | `{id?, track, dayN, lang, text, lessonUrl?, lessonLabel?}` | `{item: ContentItem}` (insert, or update by id / by track+day+lang) |
| `POST /api/admin/content/:id/delete` | — | `{ok:true}` |
| `GET /admin/file/:fileId` | — | The customer's photo or file, proxied from Telegram (the bot token never reaches the browser) |
| `GET /api/admin/live` | WebSocket upgrade | Server → browser JSON events: `{type:"message", thread: Thread, message: Message}` and `{type:"thread", thread: Thread}` |

Shapes:

- `Thread` = `{id, status:"open"|"resolved", unread (count of unread customer messages), lastText, lastAt, createdAt, user:{id, name, username, lang}}`
- `Message` = `{id, threadId, direction:"in"|"out", text, mediaKind: null|"photo"|"document"|"voice"|"video"|"sticker", fileId, fileName, createdAt}` (`in` = from the customer)
- `UserCard` = `{id, name, username, lang, createdAt, timeZone, dailyHour, dailyPaused, dailySilent, newsOptIn, track, trackDay, streak, isBlocked, ym}` (`ym`: internal customer number or null)
- `Purchase` = `{checkoutId, orderId, status, total, currency, items:[{id, title}], linkedAt}` (`total` in minor units)
- `Subscription` = `{id, planId, status, currentPeriodEnd, cancelAtPeriodEnd}`
- `ContentItem` = `{id, track, dayN, lang, text, lessonUrl, lessonLabel, updatedAt}`

Times are ISO-8601 UTC strings.
