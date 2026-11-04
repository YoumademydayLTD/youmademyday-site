import { describe, expect, it } from "vitest";
import { deliverableIds, pickFile, titleFor } from "../src/delivery/items.ts";
import { createFileToken, verifyFileToken, FILE_LINK_TTL_SECONDS } from "../src/delivery/token.ts";
import { buildItems, statusOf } from "../src/delivery/downloads.ts";
import { attachment } from "../src/delivery/handler.ts";
import type { FileManifest } from "../src/delivery/manifest.ts";
import { CATALOG } from "./fixtures.ts";

const NOW = 1_762_300_000;
const SECRET = "test-files-secret";
const file = (filename: string) => ({ sha256: "x", size: 10, filename });
const MANIFEST: FileManifest = {
  "he/b9.pdf": file("a.pdf"), "en/b9.pdf": file("a.pdf"), "fr/b9.pdf": file("a.pdf"),
  "he/b10.pdf": file("b.pdf"), "en/b10.pdf": file("b.pdf"),
  "he/b44.pdf": file("c.pdf"),
};

describe("deliverableIds", () => {
  it("expands bundles into their books and removes repeats and unknown ids", () => {
    expect(deliverableIds(["k49", "b9", "nope", "c1"], CATALOG)).toEqual(["b9", "b10", "c1"]);
  });
  it("delivers nothing for plans or the store order id", () => {
    expect(deliverableIds(["plan-grow", "store-order"], CATALOG)).toEqual([]);
  });
});

describe("pickFile", () => {
  it("uses the buyer's language when the file exists", () => {
    expect(pickFile("b9", "fr", MANIFEST)).toMatchObject({ key: "fr/b9.pdf", lang: "fr" });
  });
  it("falls back to English, then Hebrew", () => {
    expect(pickFile("b10", "fr", MANIFEST)).toMatchObject({ key: "en/b10.pdf", lang: "en" });
    expect(pickFile("b44", "ar", MANIFEST)).toMatchObject({ key: "he/b44.pdf", lang: "he" });
  });
  it("returns null when no language has the file", () => {
    expect(pickFile("c1", "he", MANIFEST)).toBeNull();
  });
});

describe("titleFor", () => {
  it("uses the buyer's title, else English, else the source title", () => {
    expect(titleFor("b9", "fr", CATALOG)).toBe("a (fr)");
    expect(titleFor("b9", "ar", CATALOG)).toBe("a (en)");
    expect(titleFor("b44", "en", CATALOG)).toBe("he only");
    expect(titleFor("zz", "en", CATALOG)).toBe("zz");
  });
});

describe("file tokens", () => {
  const claim = { key: "he/b9.pdf", filename: "a.pdf", exp: NOW + 60 };
  it("round-trips a valid token", async () => {
    expect(await verifyFileToken(await createFileToken(claim, SECRET), SECRET, NOW)).toEqual(claim);
  });
  it("rejects an expired token, a wrong secret and a changed payload", async () => {
    const token = await createFileToken(claim, SECRET);
    expect(await verifyFileToken(token, SECRET, NOW + 60)).toBeNull();
    expect(await verifyFileToken(token, "other", NOW)).toBeNull();
    const forged = await createFileToken({ ...claim, key: "he/b10.pdf" }, "other");
    expect(await verifyFileToken(`${forged.split(".")[0]}.${token.split(".")[1]}`, SECRET, NOW)).toBeNull();
    expect(await verifyFileToken("garbage", SECRET, NOW)).toBeNull();
    expect(await verifyFileToken(token, "", NOW)).toBeNull();
  });
});

describe("buildItems", () => {
  it("signs one short-lived link per available file, in the buyer's language or the fallback", async () => {
    const items = await buildItems([{ productId: "b9", lang: "fr" }, { productId: "b10", lang: "fr" }, { productId: "c1", lang: "fr" }],
      { catalog: CATALOG, manifest: MANIFEST, secret: SECRET, fileUrl: "https://w.example/api/file", nowSeconds: NOW });
    expect(items.map((i) => [i.id, i.lang, i.title])).toEqual([["b9", "fr", "a (fr)"], ["b10", "en", "b (fr)"]]);
    expect(items[0]?.expiresAt).toBe(NOW + FILE_LINK_TTL_SECONDS);
    const token = new URL(items[0]?.url ?? "").searchParams.get("t") ?? "";
    expect(await verifyFileToken(token, SECRET, NOW)).toMatchObject({ key: "fr/b9.pdf", filename: "a.pdf" });
  });
});

describe("statusOf", () => {
  it("is ready only for paid orders", () => {
    expect(statusOf(null)).toBe("pending");
    expect(statusOf({ id: "o", status: "pending", lang: null })).toBe("pending");
    expect(statusOf({ id: "o", status: "paid", lang: null })).toBe("ready");
    expect(statusOf({ id: "o", status: "partially_refunded", lang: null })).toBe("ready");
    expect(statusOf({ id: "o", status: "refunded", lang: null })).toBe("refunded");
  });
});

describe("attachment", () => {
  it("names the download safely in both header forms", () => {
    expect(attachment("your-maximum.pdf")).toBe(`attachment; filename="your-maximum.pdf"; filename*=UTF-8''your-maximum.pdf`);
    expect(attachment('ספר "1".pdf')).toBe(`attachment; filename="___ _1_.pdf"; filename*=UTF-8''${encodeURIComponent('ספר "1".pdf')}`);
  });
});
