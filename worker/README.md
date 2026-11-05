# ymd-store worker — store payments

Cloudflare Worker that opens Polar checkouts for the static store and records what Polar reports back.
Live at **https://ymd-store.crx-platform-website.workers.dev** (workers.dev, because the domain's DNS is at Spaceship).

## Endpoints

| Method + path | Caller | What it does |
| --- | --- | --- |
| `POST /api/checkout` | the site (browser, CORS: `https://youmademyday.store`, `http://127.0.0.1:4322`) | Header `Authorization: Bearer <site session>` (Telegram sign-in, checked with the bot's `GET /api/me`); without it 401 `login_required`. Body `{kind: "cart", ids: [..], lang}` or `{kind: "product" \| "plan", id, lang}`. Returns `{url}` of the payment page. Prices come from the bundled catalogue only; the checkout carries `external_customer_id` = the buyer's ym number, so Polar pre-fills and locks the email. |
| `GET /api/account` | the personal area (Bearer session) | `{library: DownloadItem[], memberships: [{id, planId, status, isTrial, currentPeriodEnd, cancelAtPeriodEnd, canCancel, amount, currency}], invoices: [{orderId, createdAt, total, currency, status, items, url}]}`. Library files come in the user's language (fallback English, then Hebrew); invoice `url` is a 30-minute signed `/api/invoice` link. The ym number is never in a reply. |
| `POST /api/account/subscriptions/:id/cancel` | the personal area (Bearer session) | Cancels one of the user's memberships: at once during the free trial (no charge), else at period end. `{membership}`; 404 not theirs, 409 already ending. |
| `GET /api/invoice?t=<token>` | the buyer's browser | The order's invoice PDF from Polar (generated on first request), passed through so no Polar URL or token reaches the browser. |
| `GET /api/read/:id` | the personal area's reader (Bearer session) | `{id, kind, title, lang, units: [{n, title, minutes, done}], done, total}` for an item the user bought or whose running membership includes it; 403 `not_entitled`. |
| `GET /api/read/:id/:n` | the reader | `{id, kind, n, title, minutes, html, prev, next, done, doneCount, total}`; `html` is sanitized at build time. |
| `POST /api/read/:id/:n/done` | the reader | `{done: boolean}` → `{done, doneCount, total}` (table `reading_progress`, per Telegram user). |
| `GET /api/order-doc?t=<token>` | the buyer (bot button, thanks page, personal area) | The order details document (the disclosure document the terms promise): a printable HTML page in the buyer's language with our company details, order number and date, items and prices, total, membership terms (period, renewal, free day, how to cancel), delivery and the refund rights with a link to the refunds page. Links are signed for a year. `GET /api/downloads` returns it as `documentUrl`; `/api/account` invoices carry `documentUrl`. |
| `POST /api/internal/subscriptions/cancel` | the bot (service binding, header `X-Internal-Secret`) | `{telegramId, subscriptionId}` → `{membership}`; the bot's cancel button and `/delete`. |
| `POST /api/polar/webhook` | Polar | Verifies the Standard Webhooks signature, stores the event once (dedupe on `webhook-id`), replies at once, then updates `checkouts` / `orders` / `subscriptions`. |
| `POST /api/links` | CRX Platform (server to server) | Header `Authorization: Bearer $YMD_LINKS_SECRET`. Body `{product, amount?, currency?, telegram_user_id?, metadata?, customer_email?, external_customer_id?, lang?, country?, customer_ip_address?}`. `product` is a store id (`b51`, `plan-max`, `store-order`, …); `amount` is in currency units (5 = 5 ₪), optional (default: the catalogue price, else a link-only price from `src/catalog/link-prices.ts`); `currency` `ils` (default), `usd` or `gel`; `metadata` up to 40 string keys, `ymd_*` reserved. A plan link is a subscription with the plan's free days set on the checkout. With `telegram_user_id` (not together with `customer_email` / `external_customer_id`) the store finds or silently creates that Telegram user's customer (same row the Telegram sign-in finds, ym number, internal email, Polar customer) — nothing is sent to him — and the checkout carries his ym as `external_customer_id`, so Polar prefills and locks the email; after he signs in to the site the purchase and invoice are in his personal area. No success URL: the buyer ends on Polar's confirmation page. Returns `{url, id, expires_at}`. |
| `GET /api/links/:id/status` | CRX Platform (same bearer) | `{id, status, product, amount, currency, telegram_user_id, checkout_status, subscription?}` for a checkout CRX opened (404 for any other). `status`: `pending` · `paid` (one-time order paid) · `refunded` (full or partial) · `trialing` · `active` (also Polar's `past_due` while it retries) · `canceled` (also `unpaid`, `incomplete_expired`, `paused`). `amount` in currency units. |
| `GET /api/downloads?checkout=<id>[&wait=1]` | the thanks page (browser) | `{status: "pending"}` until the order is paid (with `wait=1` the server re-checks for up to 20 s), then `{status: "ready", items: [{id, title, url, filename, lang, size, expiresAt}]}`; `{status: "refunded"}` after a full refund. |
| `GET /api/file?t=<token>` | the buyer's browser | Streams the PDF from R2 as an attachment. The token is HMAC-signed (`FILES_SIGNING_SECRET`) and expires after 30 minutes; reopening the thanks page gives fresh links. |
| `GET /api/health` | anyone | Database reachable, open kinds, mapped products, which secrets are set (never their values). |

Errors are JSON `{error, message}`: `bad_request` 400, `unauthorized` 401, `kind_closed` / `origin_forbidden` 403,
`unknown_item` / `not_found` 404, `payload_too_large` 413, `catalog_out_of_sync` 500, `payment_provider_error` 502.

## CRX Platform links

CRX never talks to Polar: Polar sees one integration, the store's own organization token (owner, 04.11.2026).
The two links CRX sells:

- **One-time 5 ₪ product:** `{product: "b51"}` (catalogue price 5 ₪; `amount` may override it as an ad-hoc price).
- **Maximum membership weekly at 100 GEL with one free day:** `{product: "plan-max", currency: "gel"}`. The 100 GEL is a
  link-only price (`src/catalog/link-prices.ts`) sent as an ad-hoc price on the plan's own weekly Polar product, with
  `trial_interval: day, trial_interval_count: 1` on the checkout. The subscription is the real Maximum plan (library,
  personal area, cancel button), so no extra Polar product or sync is needed. Polar keeps an ad-hoc price on the
  subscription (`Subscription.prices[].source = "ad_hoc"`); check the first renewal on the Polar dashboard.
- **Editing course «סטודיו העריכה» weekly at 100 GEL with one free day (owner, 05.11.2026):** `{product: "plan-edit", currency: "gel"}`.
  Same price, trial and mechanics as `plan-max`, on its own weekly Polar product (`site/js/telegram/plans.js`
  `LINK_PLANS`, never listed on the plans page; 129 ₪ is the catalogue price Polar requires in the default currency).
  The payment page shows the plan's description (`describeOnCheckout`). The product carries a Polar download benefit
  with lesson 1 (`content/dist/52-ai-photo-editing.pdf`, attached by `tools/polar_benefit_file.ts`), and a running
  membership opens the photography and editing items in the personal area (`src/view/plan-library.ts`). `plan-max` is
  untouched and still sold.

Paid CRX orders record entitlements like any order, but the bot is never asked to message the buyer
(`shouldNotifyBuyer`). CRX reads `GET /api/links/:id/status`; optionally the store also pushes every order/subscription
change of a CRX link to `CRX_STATUS_CALLBACK_URL` (POST, the same JSON, headers `X-YMD-Timestamp` and
`X-YMD-Signature: sha256=<hex HMAC-SHA256(YMD_LINKS_SECRET, "<timestamp>.<body>")>`). A failed push is logged only.

## How a sale is built

- Currency (same rule as `site/js/money.js`): Hebrew site → ILS; other languages → USD for items with a dollar price, else ILS.
- One item → that item's own Polar product. Several items → the private **Store order** product with an ad-hoc price equal to
  the server-computed total ("3 books, the cheapest free"), the item ids in `metadata.ymd_ids`.
- Every price is `tax_behavior: "inclusive"`: 147 ₪ is what the buyer pays.
- Discount codes are off (`allow_discount_codes: false`): the server owns prices.
- After payment Polar sends the buyer to `https://youmademyday.store/<lang>/#thanks-<checkout id>`.
- If a site price changes without a re-sync, checkout for that item fails with `catalog_out_of_sync` instead of charging the old price.

## Files

- `src/catalog/catalog.json` — generated by `tools/build_catalog.ts` from `site/js/products/*.js`, `site/js/telegram/plans.js`, `site/js/business.js`, `site/js/i18n/config.js`.
- `src/polar/products.json` — store id → Polar product and price ids, written by `tools/polar_sync.ts`.
- `src/delivery/files.json` — what is in the private R2 bucket `ymd-files` (`<lang>/<product id>.pdf` → hash, size, download name), written by `tools/upload_files.ts`.
- `migrations/` — D1 schema (`checkouts`, `orders`, `subscriptions`, `webhook_events`, `entitlements`, `customers`, `reading_progress`). `0006` adds `subscriptions.checkout_id`: apply it (`npm run db:migrate`) **before** deploying code that writes it.
- `src/catalog/link-prices.ts` — prices only CRX links use (100 GEL a week for `plan-max` and `plan-edit`).
- `tools/polar_benefit_file.ts <store id> <pdf> "<description>"` — uploads a PDF to Polar and attaches it to our product as a download benefit (reused by file hash; older benefits stay in Polar, detach by hand).
- `src/<feature>/` — `checkout`, `links`, `webhook`, `delivery`, `catalog`, `polar`, `db`, `http`. Pure logic is separate from I/O and unit-tested in `test/`; `test-tools/` covers the sync tools and checks the catalogue against the site files.

## Secrets (wrangler secret put, values in Site/.env, never committed)

| Name | What |
| --- | --- |
| `POLAR_ACCESS_TOKEN` | Polar production Organization Access Token |
| `POLAR_WEBHOOK_SECRET` | signing secret of the Polar webhook endpoint (`whsec_…`, created by `tools/polar_webhook.ts`) |
| `YMD_LINKS_SECRET` | shared secret for `POST /api/links` |
| `FILES_SIGNING_SECRET` | signs the short-lived download and invoice links |
| `YMD_INTERNAL_SECRET` | shared with the bot worker for calls between the two (`X-Internal-Secret`) |

Put one without printing it: `grep '^NAME=' ../.env | cut -d= -f2- | tr -d '\n' | npx wrangler secret put NAME`

Variables (in `wrangler.jsonc`): `SITE_URL`, `EXTRA_ORIGINS`, `POLAR_API`, `LIVE_KINDS` (`cart,product,plan`; a kind must also be on in `site/js/checkout/config.js`),
`CRX_STATUS_CALLBACK_URL` (optional, empty = no pushes to CRX).

## Customers

Buyers sign in with Telegram (the bot worker owns sessions; the store asks it over the `BOT` service binding). Each
Telegram user gets one row in `customers` with an internal running number `ym0001`, `ym0002`, … taken from the row id
(never from a name or Telegram id). It is **internal only**: never shown on the site or in the bot; the support center
shows it on the customer card and can search by it. On the first purchase the Polar customer is created with
`external_id` = the ym number and email `ymmdpayments+<ym>@gmail.com` (one inbox). `ym0000` is a demo customer on
Polar and is not ours. Polar's own customer emails are switched off for the organization (owner, 04.11.2026): receipts
live in the personal area, files on the thanks page, in the personal area and in Telegram.

Every checkout prefills the billing country (`customer_billing_address.country`): the customer's saved country (from
their first checkout), else Cloudflare's location of the visitor, else the site language (Hebrew → IL); the site
checkout also passes `customer_ip_address` from `CF-Connecting-IP`. `/api/links` takes an optional `country` and
`customer_ip_address` from its caller (the caller's own location says nothing about the buyer), else the language.

When an order is paid and its checkout has a customer, the store tells the bot (`POST /api/internal/orders/paid`)
so the files go to the buyer's Telegram chat right away.

## Reader

`tools/.venv/bin/python tools/build_reader.py` renders every lesson (with its worksheet) and e-book chapter to sanitized
HTML (same Markdown rules as the PDFs, then an allowlist sanitizer), one JSON per item and language in `content/view`.
`node tools/upload_reader.ts` uploads them to R2 as `view/<lang>/<id>.json` and writes `src/view/index.json`; then
`npm run deploy`. Membership libraries (`src/view/plan-library.ts`): Growth and Maximum open every course and book,
Companion and Mentor every course; Good Day's monthly e-book is chosen by hand.

## Delivery

On `order.paid` the webhook records **entitlements** (order → product ids, bundles expanded to their books, language from
the checkout) before it marks the order paid; a full refund revokes them. `src/delivery/downloads.ts` (`listDownloads`)
builds the signed links for an order by checkout id or order id, so the Telegram bot can reuse it. A file missing in the
buyer's language is delivered in English, then Hebrew.

New or rebuilt PDFs: `node ../tools/upload_files.ts` (skips files whose hash is unchanged), then `npm run deploy`.

## Change prices or products

1. Edit the site data (`site/js/products/*.js` via `tools/gen_products.py`, or `site/js/telegram/plans.js`).
2. `cd worker && npm run sync` — creates/updates our Polar products (only those with `metadata.ymd_id`; the owner's own products are never touched) and rewrites `src/polar/products.json`. A second run reports 0 changes.
3. `npm run deploy` — regenerates the catalogue, typechecks, runs the tests, deploys.

## Deploy from scratch

```sh
cd worker && npm install
npx wrangler d1 create ymd-store            # put the id in wrangler.jsonc
npm run db:migrate
npm run deploy
# secrets: see the table above
node ../tools/polar_webhook.ts https://<worker>/api/polar/webhook   # once; saves POLAR_WEBHOOK_SECRET to ../.env
```

Run `~/.claude/bin/load-check` before installs, tests and deploys on the shared Mac.

## Decisions (ADR)

- **04.11.2026 — Polar as merchant of record, prices owned by the server.** All card payments go through Polar (owner).
  The browser sends only ids and a language; the worker prices from a catalogue generated from the site files at build
  time and refuses to sell if Polar's copy differs. Polar charges one product per checkout, so a multi-item cart is one
  private "Store order" product with an ad-hoc tax-inclusive price and the item ids in metadata. Products with both ILS
  and USD carry two fixed prices on one Polar product (tested: Polar accepts it and `currency` on the checkout picks the
  price). The site never names the provider. Webhooks are stored raw first (dedupe on `webhook-id`) and projected into
  tables after the 200 reply.
- **04.11.2026 — Telegram sign-in for every purchase, internal customer numbers (owner).** No customer types an email:
  the Polar customer is keyed by our ym number with a plus-addressed inbox. Sessions stay in the bot worker; the store
  checks them over a service binding instead of reading session tables. Calls between the two workers use one shared
  secret. Membership cancels go through the store (trial: revoke at once, so no charge; paid: at period end).
- **04.11.2026 — CRX links through the store only (owner).** CRX gets payment links and their status from this worker,
  never from Polar. GEL prices CRX needs are ad-hoc prices on our existing products, not new Polar products: Polar requires
  a price in the organization's default currency on every product, and a separate product would split the Maximum plan
  in two. A Telegram id from CRX creates the same customer the sign-in would, without messaging him.
- **04.11.2026 — Delivery by short-lived signed links (owner).** Files live in a private R2 bucket per language; the
  thanks page lists them as soon as the order is paid. Links are HMAC tokens served and checked by the worker itself
  (no public bucket, no R2 API keys). Entitlements are a table so the Telegram bot can deliver the same files later.
- **05.11.2026 — The CRX course is a new plan, `plan-edit`, not a renamed `plan-max` (owner: «תעשה איזה קורס שקשור לעריכה»).**
  Renaming the Polar product behind `plan-max` would have renamed the store's own Maximum membership on every site
  checkout, and the next `npm run sync` would have reverted it. So the editing course «סטודיו העריכה» is a link-only
  weekly plan with the same 100 GEL a week and the same free first day; `plan-max` and `b51` are unchanged. Two
  exceptions to earlier rules, both for this plan only: its Polar product has a description (04.11 said name only), and
  it opens a fixed list of library items instead of a scope. Lesson 1 is a Polar download benefit so the buyer gets a
  file on Polar's confirmation page even before signing in to the site. The title carries no Latin letters because
  Polar's page is left-to-right and showed «עם AI» out of order (first version kept in `content/dist/history/`).
