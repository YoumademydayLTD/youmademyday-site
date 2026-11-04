// What a signed-out visitor was doing when the site sent them to sign in: the page to come back to and,
// after a pay button, the order to pay. Kept in sessionStorage (this tab only) and dropped after a while,
// so an old, abandoned sign-in never starts a payment by surprise. Storage can throw (private mode,
// blocked site data); the visitor then simply lands on the login page without the automatic return.
const STORAGE_KEY = "ymd-after-login";
export const INTENT_TTL_MS = 30 * 60 * 1000;

/**
 * route: the page to come back to, as main.js names it ("checkout", "buy-plan-grow", "account").
 * order: { kind: "cart", ids } | { kind: "product" | "plan", id } | null (only come back to the page).
 */
export function rememberIntent({ route, order = null }, now = Date.now()) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ route, order, savedAt: now }));
  } catch (error) {
    console.error("intent: storage unwritable, no automatic return after sign-in", error.name);
  }
}

const isIntent = (value) => typeof value?.route === "string" && typeof value.savedAt === "number";

/** The saved intent while it is fresh, else null. Never throws. */
export function peekIntent(now = Date.now()) {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    return isIntent(value) && now - value.savedAt <= INTENT_TTL_MS ? value : null;
  } catch {
    return null; // storage blocked or the value unreadable: same as nothing saved
  }
}

/** Reads and forgets the intent in one step, so it is acted on at most once. */
export function takeIntent(now = Date.now()) {
  const intent = peekIntent(now);
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("intent: storage unwritable", error.name);
  }
  return intent;
}
