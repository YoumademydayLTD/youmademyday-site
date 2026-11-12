import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLinkGroup, pickFromGroup } from "../src/links/group.ts";
import { LINK_GROUPS, linkGroupOf } from "../src/catalog/link-groups.ts";
import { CATALOG } from "../src/catalog/index.ts";
import { PRODUCT_MAP } from "../src/polar/mapping.ts";
import { handleLink } from "../src/links/handler.ts";
import { paymentEmail } from "../src/customers/ym.ts";
import type { Env } from "../src/env.ts";
import { fakeD1, type Answer } from "./fake-d1.ts";

const GUIDES = LINK_GROUPS["short-guide"] ?? [];
const ONE_UNIT = 100; // one dollar, pound or euro in minor units

describe("the short-guide group", () => {
  it("is the 24 one-dollar guides, each a real one-time product at 1 in every currency but shekels", () => {
    expect(GUIDES).toHaveLength(24);
    expect(GUIDES[0]).toBe("b53");
    expect(GUIDES.at(-1)).toBe("b76");
    for (const id of GUIDES) {
      expect(CATALOG.products[id]?.type, id).toBe("ebook");
      expect(CATALOG.products[id]?.langs, id).toContain("en");
      expect(PRODUCT_MAP[id]?.recurring, id).toBeNull();
      for (const currency of ["usd", "cad", "eur", "gbp", "aud"] as const) expect(PRODUCT_MAP[id]?.prices[currency]?.amount, `${id} ${currency}`).toBe(ONE_UNIT);
    }
  });
  it("is found by its name only", () => {
    expect(linkGroupOf("short-guide")).toBe(GUIDES);
    expect(linkGroupOf("constructor")).toBeNull();
    expect(linkGroupOf("")).toBeNull();
  });
});

describe("parseLinkGroup", () => {
  it("reads the group, and nothing when the request names a product", () => {
    expect(parseLinkGroup({ product_group: "short-guide" })).toEqual({ name: "short-guide", ids: GUIDES });
    expect(parseLinkGroup({ product: "b53" })).toBeNull();
    expect(parseLinkGroup({ product: "b53", product_group: null })).toBeNull();
  });
  it("refuses an unknown group, a non-string and a product next to a group", () => {
    expect(() => parseLinkGroup({ product_group: "nope" })).toThrow(/product_group must be one of: short-guide/);
    expect(() => parseLinkGroup({ product_group: 7 })).toThrow(/product_group/);
    expect(() => parseLinkGroup({ product_group: "x".repeat(41) })).toThrow(/product_group/);
    expect(() => parseLinkGroup({ product: "b53", product_group: "short-guide" })).toThrow(/not both/);
  });
});

describe("pickFromGroup", () => {
  const ids = ["b53", "b54", "b55"];
  it("gives the first product the buyer does not own yet, whatever the turn", () => {
    expect(pickFromGroup(ids, new Set(), 7)).toBe("b53");
    expect(pickFromGroup(ids, new Set(["b53"]), 7)).toBe("b54");
    expect(pickFromGroup(ids, new Set(["b54", "b53", "c1"]), 0)).toBe("b55");
  });
  it("still sells one when he owns them all, moving on with the turn", () => {
    const all = new Set(ids);
    expect(pickFromGroup(ids, all, 0)).toBe("b53");
    expect(pickFromGroup(ids, all, 4)).toBe("b54");
    expect(pickFromGroup(ids, all, 5)).toBe("b55");
  });
  it("picks by the turn for a buyer the store does not know", () => {
    expect(pickFromGroup(ids, null, 1)).toBe("b54");
    expect(pickFromGroup(ids, null, -2.9)).toBe("b55");
  });
  it("refuses an empty group instead of selling nothing", () => {
    expect(() => pickFromGroup([], null, 0)).toThrow(/at least one/);
  });
});

describe("POST /api/links for a one-dollar guide", () => {
  const SECRET = "links-secret";
  const NOW = new Date("2026-11-12T12:00:02Z"); // epoch seconds % 24 = 2 → b55 when any guide will do
  const TELEGRAM_ID = 555_000_111;
  const YM = "ym0042";
  const customerRow = { id: 42, ym: YM, telegram_id: TELEGRAM_ID, polar_customer_id: "cus_1", country: "CA" };

  function stubProvider(): Record<string, unknown>[] {
    const checkouts: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (!url.endsWith("/checkouts/")) return new Response("unexpected", { status: 500 });
      checkouts.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return Response.json({ id: `ch_${checkouts.length}`, url: `https://polar.sh/checkout/ch_${checkouts.length}`, status: "open", expires_at: "2026-11-12T13:00:00Z" });
    }));
    return checkouts;
  }
  function envWith(answer: Answer) {
    const d1 = fakeD1(answer);
    const env = { DB: d1.db, GO_BASE_URL: "https://store.test/", POLAR_API: "https://polar.test/v1", POLAR_ACCESS_TOKEN: "t", YMD_LINKS_SECRET: SECRET } as unknown as Env;
    return { env, calls: d1.calls };
  }
  const owning = (owned: string[]): Answer => (call) => {
    if (call.sql.includes("FROM customers WHERE telegram_id")) return customerRow;
    if (call.sql.includes("FROM entitlements")) return owned.map((id) => ({ product_id: id }));
    return undefined;
  };
  const post = (body: unknown) => new Request("https://store.test/api/links", { method: "POST", headers: { Authorization: `Bearer ${SECRET}` }, body: JSON.stringify(body) });

  afterEach(() => vi.unstubAllGlobals());

  it("sells a guide again to a buyer who already owns it, at 1 CAD from the catalogue, twice in a row", async () => {
    const checkouts = stubProvider();
    const { env, calls } = envWith(owning(["b53"]));
    const first = await handleLink(post({ product: "b53", currency: "cad", telegram_user_id: TELEGRAM_ID, lang: "en" }), env, NOW);
    const second = await handleLink(post({ product: "b53", currency: "cad", telegram_user_id: TELEGRAM_ID, lang: "en" }), env, NOW);
    expect([first.product, second.product]).toEqual(["b53", "b53"]);
    expect([first.id, second.id]).toEqual(["ch_1", "ch_2"]);
    for (const checkout of checkouts) {
      expect(checkout).toMatchObject({ products: [PRODUCT_MAP.b53?.productId], currency: "cad", external_customer_id: YM, locale: "en", customer_billing_address: { country: "CA" } });
      expect(checkout.prices).toBeUndefined(); // the catalogue price, not an ad-hoc one
      expect(checkout.trial_interval).toBeUndefined();
    }
    const inserts = calls.filter((c) => c.sql.includes("INSERT INTO checkouts"));
    expect(inserts.map((c) => c.args.slice(3, 7))).toEqual([["b53", "en", "cad", ONE_UNIT], ["b53", "en", "cad", ONE_UNIT]]);
    // A named product never needs the buyer's shelf.
    expect(calls.some((c) => c.sql.includes("FROM entitlements"))).toBe(false);
  });
  it("picks a guide he does not own yet when asked for the group, and says which", async () => {
    const checkouts = stubProvider();
    const { env } = envWith(owning(["b53", "b54", "c1"]));
    const reply = await handleLink(post({ product_group: "short-guide", currency: "cad", telegram_user_id: TELEGRAM_ID }), env, NOW);
    expect(reply.product).toBe("b55");
    expect(checkouts[0]?.products).toEqual([PRODUCT_MAP.b55?.productId]);
    expect(checkouts[0]?.metadata).toMatchObject({ ymd_ids: "b55", ymd_customer: YM });
  });
  it("still sells one when he owns all 24", async () => {
    stubProvider();
    const { env } = envWith(owning([...GUIDES]));
    expect((await handleLink(post({ product_group: "short-guide", currency: "cad", telegram_user_id: TELEGRAM_ID }), env, NOW)).product).toBe("b55");
  });
  it("sells any guide to a buyer without a Telegram id, and creates no account", async () => {
    stubProvider();
    const { env, calls } = envWith(() => undefined);
    expect((await handleLink(post({ product_group: "short-guide", currency: "usd" }), env, NOW)).product).toBe("b55");
    expect(calls.some((c) => c.sql.includes("customers") && c.sql.startsWith("INSERT"))).toBe(false);
  });
  it("refuses an unknown group before touching the database or the provider", async () => {
    const checkouts = stubProvider();
    const { env, calls } = envWith(() => undefined);
    await expect(handleLink(post({ product_group: "nope", telegram_user_id: TELEGRAM_ID }), env, NOW)).rejects.toThrow(/product_group/);
    expect(calls).toHaveLength(0);
    expect(checkouts).toHaveLength(0);
    expect(paymentEmail(YM)).toContain(YM); // the buyer's identity stays the store's own
  });
});
