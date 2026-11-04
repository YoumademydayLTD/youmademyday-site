// Card payment switch (owner, 04.11.2026). A kind that is off keeps the "opens soon" page.
// Products and carts are on: their files are delivered on the thanks page right after payment. Plans stay off
// until the Telegram bot that delivers memberships exists. The worker checks its own LIVE_KINDS too
// (worker/wrangler.jsonc), so turning a kind on needs both switches.
export const API_BASE = "https://ymd-store.crx-platform-website.workers.dev";

export const CHECKOUT_LIVE = { cart: true, product: true, plan: false };

export const isCheckoutLive = (kind) => CHECKOUT_LIVE[kind] === true;
