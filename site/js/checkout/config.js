// Card payment switch (owner, 04.11.2026). A kind that is off keeps the "opens soon" page.
// All kinds are on: files are delivered right after payment, memberships in the Telegram bot (owner opened plans
// on 04.11.2026). The worker checks its own LIVE_KINDS too
// (worker/wrangler.jsonc), so turning a kind on needs both switches.
export const API_BASE = "https://ymd-store.crx-platform-website.workers.dev";

export const CHECKOUT_LIVE = { cart: true, product: true, plan: true };

export const isCheckoutLive = (kind) => CHECKOUT_LIVE[kind] === true;
