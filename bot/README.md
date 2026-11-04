# ymd-bot — the store's Telegram bot and support center

Cloudflare Worker behind **@youmademydaystore_bot**, live at **https://ymd-bot.crx-platform-website.workers.dev**.
It also serves the owner's support center at **/admin** (Hebrew, RTL, works on iPhone).

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
- `UserCard` = `{id, name, username, lang, createdAt, timeZone, dailyHour, dailyPaused, dailySilent, newsOptIn, track, trackDay, streak, isBlocked}`
- `Purchase` = `{checkoutId, orderId, status, total, currency, items:[{id, title}], linkedAt}` (`total` in minor units)
- `Subscription` = `{id, planId, status, currentPeriodEnd, cancelAtPeriodEnd}`
- `ContentItem` = `{id, track, dayN, lang, text, lessonUrl, lessonLabel, updatedAt}`

Times are ISO-8601 UTC strings.
