import { describe, expect, it } from "vitest";
import { liveKinds, MAX_CART_ITEMS, parseCheckoutRequest } from "../src/checkout/request.ts";
import { HttpError } from "../src/http/errors.ts";
import { CATALOG } from "./fixtures.ts";

const codeOf = (fn: () => unknown): string => {
  try { fn(); } catch (error) { return error instanceof HttpError ? error.code : "other"; }
  return "none";
};

describe("parseCheckoutRequest", () => {
  it("accepts a cart, a product and a plan", () => {
    expect(parseCheckoutRequest({ kind: "cart", ids: ["b9", "b10"], lang: "he" }, CATALOG)).toEqual({ kind: "cart", ids: ["b9", "b10"], lang: "he" });
    expect(parseCheckoutRequest({ kind: "product", id: "b51", lang: "en" }, CATALOG)).toEqual({ kind: "product", id: "b51", lang: "en" });
    expect(parseCheckoutRequest({ kind: "plan", id: "grow", lang: "fr" }, CATALOG)).toEqual({ kind: "plan", id: "grow", lang: "fr" });
  });
  it("ignores any amount the browser sends", () => {
    expect(parseCheckoutRequest({ kind: "product", id: "b9", lang: "he", amount: 1, price: 1 }, CATALOG)).toEqual({ kind: "product", id: "b9", lang: "he" });
  });
  it("rejects unknown kinds and languages", () => {
    expect(codeOf(() => parseCheckoutRequest({ kind: "gift", id: "b9", lang: "he" }, CATALOG))).toBe("bad_request");
    expect(codeOf(() => parseCheckoutRequest({ kind: "product", id: "b9", lang: "de" }, CATALOG))).toBe("bad_request");
    expect(codeOf(() => parseCheckoutRequest({ kind: "product", id: "b9" }, CATALOG))).toBe("bad_request");
  });
  it("rejects unknown ids and products not sold in that language", () => {
    expect(codeOf(() => parseCheckoutRequest({ kind: "product", id: "b999", lang: "he" }, CATALOG))).toBe("unknown_item");
    expect(codeOf(() => parseCheckoutRequest({ kind: "product", id: "b44", lang: "en" }, CATALOG))).toBe("unknown_item");
    expect(codeOf(() => parseCheckoutRequest({ kind: "plan", id: "spark", lang: "he" }, CATALOG))).toBe("unknown_item");
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: ["b9", "nope"], lang: "he" }, CATALOG))).toBe("unknown_item");
  });
  it("rejects empty, repeated, oversized and non-string carts", () => {
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: [], lang: "he" }, CATALOG))).toBe("bad_request");
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: ["b9", "b9"], lang: "he" }, CATALOG))).toBe("bad_request");
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: Array(MAX_CART_ITEMS + 1).fill("b9"), lang: "he" }, CATALOG))).toBe("bad_request");
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: [9], lang: "he" }, CATALOG))).toBe("bad_request");
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: "b9", lang: "he" }, CATALOG))).toBe("bad_request");
  });
  it("keeps direct offers out of carts", () => {
    expect(codeOf(() => parseCheckoutRequest({ kind: "cart", ids: ["b9", "b51"], lang: "he" }, CATALOG))).toBe("bad_request");
  });
});

describe("liveKinds", () => {
  it("reads the comma list, ignoring spaces and blanks", () => {
    expect([...liveKinds(" cart, product ,,")]).toEqual(["cart", "product"]);
    expect(liveKinds("").size).toBe(0);
  });
});
