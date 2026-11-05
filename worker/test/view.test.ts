import { describe, expect, it } from "vitest";
import { findView, type ViewIndex } from "../src/view/units.ts";
import { includedProducts } from "../src/view/plan-library.ts";
import { libraryItem } from "../src/view/library.ts";
import { CATALOG } from "./fixtures.ts";
import type { CatalogProduct } from "../src/catalog/index.ts";

const units = [{ n: 1, title: "One", minutes: 20 }, { n: 2, title: "Two", minutes: 25 }];
const INDEX: ViewIndex = {
  "he/c1": { kind: "course", units, sha256: "x" },
  "en/c1": { kind: "course", units, sha256: "y" },
  "he/b44": { kind: "book", units: [{ n: 1, title: "פרק", minutes: null }], sha256: "z" },
};

describe("findView", () => {
  it("uses the buyer's language, then English, then Hebrew", () => {
    expect(findView(INDEX, "c1", "en")).toMatchObject({ lang: "en", key: "view/en/c1.json" });
    expect(findView(INDEX, "c1", "fr")).toMatchObject({ lang: "en" });
    expect(findView(INDEX, "b44", "ru")).toMatchObject({ lang: "he", key: "view/he/b44.json" });
    expect(findView(INDEX, "b9", "he")).toBeNull();
  });
});

describe("includedProducts", () => {
  it("opens everything for Growth and Maximum, courses for Companion and Mentor, nothing for Good Day", () => {
    const all = includedProducts(["grow"], CATALOG);
    expect(all.has("c1") && all.has("b9") && all.has("b51")).toBe(true);
    expect(all.has("k49")).toBe(false); // bundles are their books, already in the list
    expect([...includedProducts(["community"], CATALOG)]).toEqual(["c1"]);
    expect(includedProducts(["day"], CATALOG).size).toBe(0);
    expect(includedProducts([], CATALOG).size).toBe(0);
  });
  it("opens only the named photography and editing items for the editing studio", () => {
    const { c1, b9 } = CATALOG.products as Record<"c1" | "b9", CatalogProduct>;
    const catalog = { ...CATALOG, products: { ...CATALOG.products, c5: c1, b28: b9 } };
    expect([...includedProducts(["edit"], catalog)].sort()).toEqual(["b28", "c5"]);
    expect(includedProducts(["edit"], CATALOG).size).toBe(0); // none of them in this catalogue
  });
});

describe("libraryItem", () => {
  const download = { id: "c1", title: "course", url: "u", filename: "f.pdf", lang: "he", size: 1, expiresAt: 1 };
  it("adds the kind, whether it can be read, whether a membership opened it, and progress", () => {
    expect(libraryItem(download, { catalog: CATALOG, index: INDEX, lang: "he", viaPlan: new Set(["c1"]), done: new Map([["c1", 1]]) }))
      .toMatchObject({ kind: "course", readable: true, viaPlan: true, progress: { done: 1, total: 2 } });
    expect(libraryItem({ ...download, id: "b9" }, { catalog: CATALOG, index: INDEX, lang: "he", viaPlan: new Set(), done: new Map() }))
      .toMatchObject({ kind: "book", readable: false, viaPlan: false, progress: null });
  });
});
