import { describe, expect, it } from "vitest";
import { buildDocData, docLang } from "../src/orderdoc/data.ts";
import { escapeHtml, renderOrderDoc } from "../src/orderdoc/render.ts";
import { orderDocUrl, parseDocClaim } from "../src/orderdoc/link.ts";
import { verifyFileToken } from "../src/delivery/token.ts";
import { CATALOG } from "./fixtures.ts";

const order = (over: Partial<{ status: string; currency: string; totalAmount: number; itemIds: string[] }> = {}) =>
  ({ id: "ord-1", status: "paid", currency: "ils", totalAmount: 8400, itemIds: ["b9", "b10", "b11"], createdAt: "2026-11-04T10:00:00Z", ...over });
const REFUNDS = "https://youmademyday.store/he/refunds";

describe("buildDocData", () => {
  it("lists each item at its price, the book deal and the total paid", () => {
    const data = buildDocData(order(), "en", CATALOG, REFUNDS);
    expect(data.items.map((i) => i.amount)).toEqual([4500, 2900, 3900]);
    expect(data.deal).toBe(2900);
    expect(data.total).toBe(8400);
    expect(data.hasFiles).toBe(true);
    expect(data.plan).toBeNull();
    expect(data.business.name).toBe("You Made My Day Ltd.");
  });
  it("prices a dollar order in dollars, without the shekel deal", () => {
    const data = buildDocData(order({ currency: "usd", totalAmount: 200, itemIds: ["b51"] }), "en", CATALOG, REFUNDS);
    expect(data.items).toEqual([{ title: "flagship (en)", amount: 200 }]);
    expect(data.deal).toBe(0);
  });
  it("describes a membership: title in the buyer's language, period price and free days", () => {
    const data = buildDocData(order({ currency: "ils", totalAmount: 0, itemIds: ["grow"] }), "he", CATALOG, REFUNDS);
    expect(data.plan).toEqual({ title: "מנוי צמיחה", period: "week", amount: 14700, trialDays: 1 });
    expect(data.hasFiles).toBe(false);
  });
  it("falls back to the default language for an unknown one", () => {
    expect(docLang("de", CATALOG)).toBe("en");
    expect(docLang(null, CATALOG)).toBe("en");
    expect(docLang("he", CATALOG)).toBe("he");
  });
});

describe("renderOrderDoc", () => {
  it("is RTL in Hebrew and carries the company, rights, delivery and membership terms", () => {
    const html = renderOrderDoc(buildDocData(order({ itemIds: ["grow", "b9"], totalAmount: 4500 }), "he", CATALOG, REFUNDS), "N0NCE");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("מסמך פרטי העסקה");
    expect(html).toContain("עשית לי את היום בע״מ");
    expect(html).toContain("14 יום");
    expect(html).toContain(REFUNDS);
    expect(html).toContain("מתחדש אוטומטית");
    expect(html).toContain("ימים ראשונים בחינם");
    expect(html).toContain("קבצים דיגיטליים");
    expect(html).toContain('nonce="N0NCE"');
  });
  it("escapes catalogue text", () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  });
  it("marks a refunded order", () => {
    expect(renderOrderDoc(buildDocData(order({ status: "refunded" }), "en", CATALOG, REFUNDS), "n")).toContain("This order was refunded.");
  });
});

describe("document links", () => {
  it("sign the order and language, last a year, and are told apart from file links", async () => {
    const now = 1_800_000_000;
    const url = await orderDocUrl("https://w", "secret", "ord-1", "fr", now);
    const claim = await verifyFileToken(new URL(url).searchParams.get("t") ?? "", "secret", now + 300 * 24 * 3600);
    expect(parseDocClaim(claim)).toEqual({ orderId: "ord-1", lang: "fr" });
    expect(parseDocClaim({ key: "fr/b9.pdf", filename: "a", exp: 1 })).toBeNull();
    expect(parseDocClaim(null)).toBeNull();
  });
});
