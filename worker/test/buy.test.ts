import { afterEach, describe, expect, it, vi } from "vitest";
import { buyUrlOf, isStayRequest, reusableLinkOf, REUSABLE_LINKS } from "../src/buy/slugs.ts";
import { decideBuy } from "../src/buy/decide.ts";
import { reusableRequest } from "../src/buy/checkout.ts";
import { handleBuy } from "../src/buy/handler.ts";
import { isLinkPreview } from "../src/go/browser.ts";
import { escapeHtml } from "../src/go/page.ts";
import { PRODUCT_MAP } from "../src/polar/mapping.ts";
import { LINK_PRICES } from "../src/catalog/link-prices.ts";
import type { Env } from "../src/env.ts";
import { fakeD1 } from "./fake-d1.ts";

const BASE = "https://store.test";
const NONCE = "bm9uY2U=";
const NOW = new Date("2026-11-05T19:00:00Z");
const EDIT = { storeId: "plan-edit", currency: "gel", lang: "he" } as const;

const UA = {
  desktopChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; he_IL; he; scale=3.00; 1179x2556; 657148427)",
  instagramAndroid: "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android",
  telegramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  facebookPreview: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  telegramPreview: "TelegramBot (like TwitterBot)",
  whatsappPreview: "WhatsApp/2.23.20.0 A",
  cubotPhone: "Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG 5 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};

describe("the reusable link table", () => {
  it("knows «edit»: the editing plan in GEL, Hebrew", () => expect(reusableLinkOf("edit")).toEqual(EDIT));
  it("knows nothing else, not even inherited object keys", () => {
    for (const slug of ["", "max", "EDIT", "edit ", "constructor", "__proto__", "toString", "hasOwnProperty"]) expect(reusableLinkOf(slug)).toBeNull();
  });
  it("sells only products the store maps to Polar, at a price the link can charge", () => {
    for (const link of Object.values(REUSABLE_LINKS)) {
      expect(PRODUCT_MAP[link.storeId]).toBeDefined();
      const price = PRODUCT_MAP[link.storeId]?.prices[link.currency as "ils"] ?? LINK_PRICES[link.storeId]?.[link.currency];
      expect(price).toBeGreaterThan(0);
    }
  });
  it("builds its URL on the configured base, with or without the stay flag", () => {
    expect(buyUrlOf(BASE, "edit")).toBe("https://store.test/buy/edit");
    expect(buyUrlOf(`${BASE}/`, "edit", true)).toBe("https://store.test/buy/edit?here=1");
  });
  it("reads the stay flag only as here=1", () => {
    expect(isStayRequest(`${BASE}/buy/edit?here=1`)).toBe(true);
    for (const url of [`${BASE}/buy/edit`, `${BASE}/buy/edit?here=0`, `${BASE}/buy/edit?here`, `${BASE}/buy/edit?stay=1`]) expect(isStayRequest(url)).toBe(false);
  });
});

describe("link previews", () => {
  it.each(["facebookPreview", "telegramPreview", "whatsappPreview"] as const)("%s is a preview", (name) => expect(isLinkPreview(UA[name])).toBe(true));
  it.each(["desktopChrome", "iosSafari", "instagramIos", "instagramAndroid", "telegramIos", "cubotPhone"] as const)("%s is a person", (name) =>
    expect(isLinkPreview(UA[name])).toBe(false));
  it("treats a missing User-Agent as a person", () => expect(isLinkPreview(null)).toBe(false));
});

describe("decideBuy", () => {
  const decide = (userAgent: string | null, isStay = false, slug = "edit") => decideBuy({ slug, userAgent, isStay });
  it("answers missing for an unknown slug, whoever asks", () => {
    expect(decide(UA.desktopChrome, false, "nope")).toEqual({ action: "missing" });
    expect(decide(UA.facebookPreview, false, "nope")).toEqual({ action: "missing" });
  });
  it("opens a checkout for a normal browser", () => {
    for (const ua of [UA.desktopChrome, UA.iosSafari, null]) expect(decide(ua)).toEqual({ action: "checkout", link: EDIT });
  });
  it("bounces an in-app browser to the real one", () => {
    expect(decide(UA.instagramIos)).toEqual({ action: "bounce", kind: "ios-in-app", link: EDIT });
    expect(decide(UA.instagramAndroid)).toEqual({ action: "bounce", kind: "android-in-app", link: EDIT });
    expect(decide(UA.telegramIos)).toEqual({ action: "bounce", kind: "ios-in-app", link: EDIT });
  });
  it("opens the checkout in place when the in-app browser asks to stay", () => {
    expect(decide(UA.instagramIos, true)).toEqual({ action: "checkout", link: EDIT });
    expect(decide(UA.instagramAndroid, true)).toEqual({ action: "checkout", link: EDIT });
  });
  it("never opens a checkout for a link preview, even with the stay flag", () => {
    expect(decide(UA.facebookPreview)).toEqual({ action: "preview" });
    expect(decide(UA.telegramPreview, true)).toEqual({ action: "preview" });
  });
});

describe("reusableRequest", () => {
  it("carries the offer and the visitor's location, and no buyer", () => {
    expect(reusableRequest(EDIT, { country: "GE", ip: "203.0.113.9" })).toEqual({
      storeId: "plan-edit", currency: "gel", metadata: {}, lang: "he", country: "GE", customerIp: "203.0.113.9",
    });
  });
  it("falls back to the language's country when Cloudflare does not know the visitor", () => {
    expect(reusableRequest(EDIT, { country: "XX", ip: null })).toEqual({ storeId: "plan-edit", currency: "gel", metadata: {}, lang: "he", country: "IL" });
  });
});

interface PolarCall { path: string; body: Record<string, unknown> }

function stubPolar(answer: (n: number) => Response): PolarCall[] {
  const calls: PolarCall[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ path: url.replace("https://polar.test/v1", ""), body: init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {} });
    return answer(calls.length);
  }));
  return calls;
}

const checkoutReply = (n: number) => Response.json({ id: `ch_${n}`, url: `https://polar.sh/checkout/polar_c_${n}`, status: "open", expires_at: "2026-11-05T20:00:00Z" });

function buy(userAgent: string | null, path = "/buy/edit", d1 = fakeD1(() => undefined)) {
  const env = { DB: d1.db, POLAR_API: "https://polar.test/v1", POLAR_ACCESS_TOKEN: "t", GO_BASE_URL: BASE } as unknown as Env;
  const request = new Request(`${BASE}${path}`, { headers: { ...(userAgent ? { "User-Agent": userAgent } : {}), "CF-Connecting-IP": "203.0.113.9" } });
  const slug = path.split("?")[0]?.split("/")[2] ?? "";
  return handleBuy(request, slug, { env, nonce: NONCE, now: NOW });
}

describe("GET /buy/:slug", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("sends a normal browser to a new checkout, never cached", async () => {
    stubPolar(checkoutReply);
    const response = await buy(UA.desktopChrome);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://polar.sh/checkout/polar_c_1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("opens a different checkout on every open of the same link", async () => {
    stubPolar(checkoutReply);
    const first = (await buy(UA.desktopChrome)).headers.get("Location");
    const second = (await buy(UA.desktopChrome)).headers.get("Location");
    expect(first).not.toBe(second);
  });

  it("asks Polar for the editing plan at 100 GEL a week after a free day, with no customer of any kind", async () => {
    const calls = stubPolar(checkoutReply);
    await buy(UA.iosSafari);
    expect(calls.map((c) => c.path)).toEqual(["/checkouts/"]);
    const body = calls[0]?.body ?? {};
    const productId = PRODUCT_MAP["plan-edit"]?.productId ?? "";
    expect(body).toMatchObject({
      products: [productId], currency: "gel", trial_interval: "day", trial_interval_count: 1, allow_discount_codes: false, locale: "en",
      metadata: { ymd_source: "crx", ymd_kind: "reusable", ymd_ids: "edit" },
    });
    expect((body.prices as Record<string, unknown[]>)[productId]).toContainEqual(expect.objectContaining({ price_amount: 10_000, price_currency: "gel" }));
    for (const field of ["customer_id", "customer_email", "customer_name", "external_customer_id"]) expect(body).not.toHaveProperty(field);
    expect(body.metadata).not.toHaveProperty("ymd_customer");
  });

  it("records each checkout like a CRX link, with no customer", async () => {
    stubPolar(checkoutReply);
    const d1 = fakeD1(() => undefined);
    await buy(UA.desktopChrome, "/buy/edit", d1);
    const insert = d1.calls.find((c) => c.sql.startsWith("INSERT INTO checkouts"));
    expect(insert?.args.slice(0, 7)).toEqual(["ch_1", "crx", "reusable", "edit", "he", "gel", 10_000]);
    expect(insert?.args[10]).toBeNull();
  });

  it("still sends the buyer on when the row could not be written, and says so in the log", async () => {
    stubPolar(checkoutReply);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const d1 = fakeD1((call) => { if (call.sql.startsWith("INSERT")) throw new Error("D1 down"); return undefined; });
    const response = await buy(UA.desktopChrome, "/buy/edit", d1);
    expect(response.status).toBe(302);
    expect(logged).toHaveBeenCalledWith("buy: checkout not recorded", "ch_1", "D1 down");
  });

  it("gives Instagram on iPhone the Safari hand-off to this same link, staying here only with the flag", async () => {
    const calls = stubPolar(checkoutReply);
    const response = await buy(UA.instagramIos);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-go="x-safari-https://store.test/buy/edit"');
    expect(html).toContain('data-pay="https://store.test/buy/edit?here=1"');
    expect(calls).toHaveLength(0);
  });

  it("gives Instagram on Android the Chrome intent for this link, falling back to staying here", async () => {
    stubPolar(checkoutReply);
    const html = await (await buy(UA.instagramAndroid)).text();
    const intent = `intent://store.test/buy/edit#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(`${BASE}/buy/edit?here=1`)};end`;
    expect(html).toContain(`data-go="${escapeHtml(intent)}"`);
    expect(html).toContain(`href="${escapeHtml(`${BASE}/buy/edit?here=1`)}">או המשך כאן</a>`);
  });

  it("opens the checkout inside the app when the fallback asks to stay, so it never bounces twice", async () => {
    stubPolar(checkoutReply);
    const response = await buy(UA.instagramIos, "/buy/edit?here=1");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://polar.sh/checkout/polar_c_1");
  });

  it("shows a link preview a plain page and opens no checkout", async () => {
    const calls = stubPolar(checkoutReply);
    const response = await buy(UA.facebookPreview);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('href="https://store.test/buy/edit"');
    expect(calls).toHaveLength(0);
  });

  it("answers the missing page for an unknown slug without calling Polar", async () => {
    const calls = stubPolar(checkoutReply);
    const response = await buy(UA.desktopChrome, "/buy/other");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("הקישור הזה לא פעיל");
    expect(calls).toHaveLength(0);
  });

  it("shows a retry page when Polar refuses, never a redirect", async () => {
    stubPolar(() => new Response('{"detail":"nope"}', { status: 422 }));
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await buy(UA.desktopChrome);
    expect(response.status).toBe(502);
    expect(response.headers.get("Location")).toBeNull();
    expect(await response.text()).toContain('href="https://store.test/buy/edit?here=1">לנסות שוב</a>');
    expect(logged).toHaveBeenCalledWith("buy: Polar refused", "plan-edit", 422, '{"detail":"nope"}');
  });

  it("never redirects to a page outside polar.sh", async () => {
    stubPolar(() => Response.json({ id: "ch_x", url: "https://evil.example/pay", status: "open", expires_at: "2026-11-05T20:00:00Z" }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await buy(UA.desktopChrome);
    expect(response.status).toBe(502);
    expect(response.headers.get("Location")).toBeNull();
  });
});
