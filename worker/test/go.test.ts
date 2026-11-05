import { afterEach, describe, expect, it, vi } from "vitest";
import { browserKindOf, chromeIntentUrl, safariUrl } from "../src/go/browser.ts";
import { goUrlOf, isGoId, isPolarCheckoutUrl, newGoId } from "../src/go/link.ts";
import { escapeHtml, renderBouncePage } from "../src/go/page.ts";
import { handleGo } from "../src/go/handler.ts";
import { handleLink } from "../src/links/handler.ts";
import type { Env } from "../src/env.ts";
import { fakeD1, type Answer } from "./fake-d1.ts";

const CHECKOUT_URL = "https://polar.sh/checkout/polar_c_AbC123xyz";
const GO_ID = "ABCDEFGHIJ";
const NONCE = "bm9uY2U=";

const UA = {
  telegramAndroid: "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 Telegram-Android/11.4.2 (Samsung SM-S918B; Android 14; SDK 34; HIGH)",
  // Telegram's iOS browser is a WKWebView: no "Telegram" and no "Safari/" in its User-Agent.
  telegramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  instagramAndroid: "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android",
  facebookIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.0;FBBV/1]",
  androidWebviewOnly: "Mozilla/5.0 (Linux; Android 12; SM-A525F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36",
  androidChrome: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  desktopChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  telegramPreviewBot: "TelegramBot (like TwitterBot)",
};

describe("browserKindOf", () => {
  it.each([
    ["telegramAndroid", "android-in-app"],
    ["instagramAndroid", "android-in-app"],
    ["androidWebviewOnly", "android-in-app"],
    ["telegramIos", "ios-in-app"],
    ["facebookIos", "ios-in-app"],
    ["androidChrome", "browser"],
    ["iosSafari", "browser"],
    ["iosChrome", "browser"],
    ["desktopChrome", "browser"],
    ["telegramPreviewBot", "browser"],
  ] as const)("%s → %s", (name, kind) => expect(browserKindOf(UA[name])).toBe(kind));
  it("treats a missing User-Agent as a normal browser", () => expect(browserKindOf(null)).toBe("browser"));
});

describe("hand-off URLs", () => {
  it("opens Chrome with the payment page and falls back to the same https page", () => {
    expect(chromeIntentUrl(`${CHECKOUT_URL}?a=1`)).toBe(
      `intent://polar.sh/checkout/polar_c_AbC123xyz?a=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(`${CHECKOUT_URL}?a=1`)};end`,
    );
  });
  it("opens Safari with the x-safari-https scheme", () => expect(safariUrl(CHECKOUT_URL)).toBe("x-safari-https://polar.sh/checkout/polar_c_AbC123xyz"));
});

describe("go link ids and targets", () => {
  it("makes a 10-symbol URL-safe id from random bytes", () => {
    expect(newGoId(Uint8Array.from({ length: 10 }, (_, i) => i))).toBe(GO_ID);
    expect(newGoId(Uint8Array.from([255, 254, 63, 62, 64, 0, 1, 2, 3, 4]))).toBe("_-_-AABCDE");
    expect(() => newGoId(new Uint8Array(3))).toThrow(/random bytes/);
  });
  it("accepts only well-formed ids", () => {
    expect(isGoId(GO_ID)).toBe(true);
    expect(isGoId("a-b_c1234Z")).toBe(true);
    for (const bad of ["", "short", "ABCDEFGHIJK", "ABCDE/GHIJ", "ABCDE.GHIJ", "../../etc1"]) expect(isGoId(bad)).toBe(false);
  });
  it("builds the public URL on the configured base", () => {
    expect(goUrlOf("https://ymd-store.example.dev", GO_ID)).toBe("https://ymd-store.example.dev/go/ABCDEFGHIJ");
    expect(goUrlOf("https://ymd-store.example.dev/", GO_ID)).toBe("https://ymd-store.example.dev/go/ABCDEFGHIJ");
  });
  it("serves only https Polar payment pages", () => {
    expect(isPolarCheckoutUrl(CHECKOUT_URL)).toBe(true);
    for (const bad of [
      "http://polar.sh/checkout/polar_c_1", "https://evil.example/checkout/polar_c_1", "https://polar.sh.evil.example/checkout/x",
      "https://polar.sh@evil.example/checkout/x", "https://user@polar.sh/checkout/x", "https://polar.sh:8443/checkout/x",
      "https://polar.sh/checkout/", "https://polar.sh/dashboard", "javascript:alert(1)", "not a url", "",
    ]) expect(isPolarCheckoutUrl(bad)).toBe(false);
  });
});

describe("the bounce page", () => {
  it("escapes everything it puts into HTML", () => expect(escapeHtml(`"><script>&'`)).toBe("&quot;&gt;&lt;script&gt;&amp;&#39;"));
  it("is Hebrew, right-to-left, and loads nothing from elsewhere", () => {
    const html = renderBouncePage({ kind: "android-in-app", checkoutUrl: CHECKOUT_URL, nonce: NONCE });
    expect(html).toContain('<html lang="he" dir="rtl"');
    expect(html).not.toMatch(/<(link|img|iframe)\b|\bsrc=/);
    expect(html).toContain(`<script nonce="${NONCE}">`);
  });
  it("puts the hand-off script after the buttons, so they exist even if the hand-off stops the page loading", () => {
    for (const kind of ["android-in-app", "ios-in-app"] as const) {
      const html = renderBouncePage({ kind, checkoutUrl: CHECKOUT_URL, nonce: NONCE });
      expect(html.indexOf("<script")).toBeGreaterThan(html.indexOf('class="btn later"'));
      expect(html.indexOf("<script")).toBeGreaterThan(html.indexOf("</main>"));
    }
  });
});

const rowWith = (url: string): Answer => (call) => (call.sql.includes("FROM checkouts WHERE go_id") && call.args[0] === GO_ID ? { url } : undefined);
const goRequest = (userAgent: string | null, id = GO_ID) =>
  handleGo(new Request(`https://store.test/go/${id}`, { headers: userAgent ? { "User-Agent": userAgent } : {} }), id, { db: fakeD1(rowWith(CHECKOUT_URL)).db, nonce: NONCE });

describe("GET /go/:id", () => {
  it("looks up only CRX checkouts that have a stored payment page", async () => {
    const d1 = fakeD1(rowWith(CHECKOUT_URL));
    await handleGo(new Request(`https://store.test/go/${GO_ID}`), GO_ID, { db: d1.db, nonce: NONCE });
    expect(d1.calls[0]?.sql).toContain("go_id = ?");
    expect(d1.calls[0]?.sql).toContain("source = 'crx'");
    expect(d1.calls[0]?.sql).toContain("url IS NOT NULL");
    expect(d1.calls[0]?.args).toEqual([GO_ID]);
  });
  it("sends a normal browser straight to the payment page", async () => {
    const response = await goRequest(UA.desktopChrome);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(CHECKOUT_URL);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("gives Telegram on Android the Chrome hand-off page with a retry button and a stay link", async () => {
    const response = await goRequest(UA.telegramAndroid);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Content-Security-Policy")).toContain(`script-src 'nonce-${NONCE}'`);
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    const html = await response.text();
    const intent = chromeIntentUrl(CHECKOUT_URL);
    expect(html).toContain(`data-go="${escapeHtml(intent)}"`);
    expect(html).toContain(`href="${escapeHtml(intent)}">פתח בכרום</a>`);
    expect(html).toContain(`href="${CHECKOUT_URL}">או המשך כאן</a>`);
    expect(html).toContain("1500");
  });
  it("gives Telegram on iPhone the Safari hand-off that goes on to the payment page by itself", async () => {
    const html = await (await goRequest(UA.telegramIos)).text();
    expect(html).toContain('data-go="x-safari-https://polar.sh/checkout/polar_c_AbC123xyz"');
    expect(html).toContain(`data-pay="${CHECKOUT_URL}"`);
    expect(html).toContain("location.replace(h.dataset.pay)");
    expect(html).toContain("1200");
  });
  it("answers 404 for an unknown id", async () => {
    const response = await handleGo(new Request("https://store.test/go/ZZZZZZZZZZ"), "ZZZZZZZZZZ", { db: fakeD1(rowWith(CHECKOUT_URL)).db, nonce: NONCE });
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("הקישור הזה לא פעיל");
  });
  it("answers 404 without touching the database for a malformed id", async () => {
    const d1 = fakeD1(rowWith(CHECKOUT_URL));
    const response = await handleGo(new Request("https://store.test/go/x"), "x", { db: d1.db, nonce: NONCE });
    expect(response.status).toBe(404);
    expect(d1.calls).toHaveLength(0);
  });
  it("never redirects to a stored URL that is not a Polar payment page", async () => {
    const response = await handleGo(new Request(`https://store.test/go/${GO_ID}`, { headers: { "User-Agent": UA.desktopChrome } }), GO_ID,
      { db: fakeD1(rowWith("https://evil.example/checkout/x")).db, nonce: NONCE });
    expect(response.status).toBe(404);
    expect(response.headers.get("Location")).toBeNull();
  });
});

describe("POST /api/links and the go link", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  const linkEnv = (d1: ReturnType<typeof fakeD1>) => ({
    DB: d1.db, POLAR_API: "https://polar.test/v1", POLAR_ACCESS_TOKEN: "t", YMD_LINKS_SECRET: "s", GO_BASE_URL: "https://store.test",
  } as unknown as Env);
  const create = (env: Env) => handleLink(new Request("https://store.test/api/links", { method: "POST", headers: { Authorization: "Bearer s" }, body: '{"product":"b51"}' }),
    env, new Date("2026-11-05T12:00:00Z"), Uint8Array.from({ length: 10 }, (_, i) => i));
  it("stores no go link and returns go_url null when Polar's page is not on polar.sh", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "ch_2", url: "https://elsewhere.example/pay/1", status: "open", expires_at: "2026-11-05T13:00:00Z" })));
    const d1 = fakeD1(() => undefined);
    const reply = await create(linkEnv(d1));
    expect(reply).toMatchObject({ url: "https://elsewhere.example/pay/1", go_url: null, id: "ch_2" });
    expect(d1.calls.some((c) => c.sql.startsWith("UPDATE checkouts SET url"))).toBe(false);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("outside polar.sh"), "ch_2");
  });
});
