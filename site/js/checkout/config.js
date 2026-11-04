// Card payment switch (owner, 04.11.2026). A kind that is off keeps the "opens soon" page.
// Everything stays off until automatic delivery after payment exists; plans also need the Telegram bot that delivers memberships exists. The worker checks its own
// LIVE_KINDS too (worker/wrangler.jsonc), so turning a kind on needs both switches.
export const API_BASE = "https://ymd-store.crx-platform-website.workers.dev";

export const CHECKOUT_LIVE = { cart: false, product: false, plan: false }; // off until delivery after payment exists

export const isCheckoutLive = (kind) => CHECKOUT_LIVE[kind] === true;
