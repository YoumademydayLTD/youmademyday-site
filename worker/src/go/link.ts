// The bounce link's pieces (pure): its short random id, its public URL, and which payment pages it may lead to.

// base64url: 64 symbols, so one random byte masked to 6 bits picks a symbol with no bias.
const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SYMBOL_MASK = 0b111111;
export const GO_ID_LENGTH = 10; // 60 random bits: not guessable, still short in a chat
const GO_ID_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${GO_ID_LENGTH}}$`);
export const GO_PATH_PREFIX = "/go/";

// Only the payment pages Polar itself serves (checked on live checkouts, 05.11.2026: https://polar.sh/checkout/polar_c_…).
const POLAR_CHECKOUT_HOST = "polar.sh";
const POLAR_CHECKOUT_PATH = "/checkout/";

/** A new go id from the given random bytes (crypto.getRandomValues in the worker, fixed bytes in tests). */
export function newGoId(randomBytes: Uint8Array): string {
  if (randomBytes.length < GO_ID_LENGTH) throw new Error(`a go id needs ${GO_ID_LENGTH} random bytes`);
  return [...randomBytes.slice(0, GO_ID_LENGTH)].map((byte) => ID_ALPHABET[byte & SYMBOL_MASK]).join("");
}

export const isGoId = (value: string): boolean => GO_ID_PATTERN.test(value);

/** The public bounce URL for a go id, on the configured base (no trailing slash needed). */
export const goUrlOf = (baseUrl: string, goId: string): string => `${baseUrl.replace(/\/+$/, "")}${GO_PATH_PREFIX}${goId}`;

/** True only for an https Polar payment page: the bounce never leads anywhere else. */
export function isPolarCheckoutUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.hostname === POLAR_CHECKOUT_HOST && !url.port && !url.username && !url.password
    && url.pathname.startsWith(POLAR_CHECKOUT_PATH) && url.pathname.length > POLAR_CHECKOUT_PATH.length;
}
