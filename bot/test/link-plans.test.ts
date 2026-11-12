// The weekly link plans in the bot: which tracks each opens, and that every sold plan has a name in every language.
import { describe, expect, it } from "vitest";
import catalog from "../../worker/src/catalog/catalog.json";
import { canReceive, TRACKS } from "../src/config/tracks.ts";
import { planName } from "../src/i18n/index.ts";
import { LANGS } from "../src/config/langs.ts";
import { planPriceMinor } from "../src/billing/plan-price.ts";

const TRACK_PLANS = ["calm", "confidence", "goals"];
const open = (plans: string[]): string[] => TRACKS.filter((track) => canReceive(track, plans)).map((track) => track.id);

describe("tracks of the weekly link plans", () => {
  it("opens its own track for a track plan, and no other paid track", () => {
    for (const plan of TRACK_PLANS) expect(open([plan]).sort(), plan).toEqual([plan, "spark"].sort());
  });
  it("adds up for a member who holds two track plans", () => {
    expect(open(["calm", "goals"]).sort()).toEqual(["calm", "goals", "spark"]);
  });
  it("opens every track for the library plan", () => {
    expect(open(["library"])).toEqual(TRACKS.map((track) => track.id));
  });
  it("opens no paid track for a studio plan or the editing course", () => {
    for (const plan of ["ai", "design", "sheets", "writing", "photo", "focus", "social", "web", "edit"]) expect(open([plan]), plan).toEqual(["spark"]);
  });
  it("leaves the store's own memberships as they were", () => {
    for (const plan of ["grow", "max", "day", "community", "mentor"]) expect(open([plan]), plan).toEqual(TRACKS.map((track) => track.id));
    expect(open([])).toEqual(["spark"]);
  });
});

describe("names and prices of the weekly link plans", () => {
  const linkPlans = Object.entries(catalog.plans).filter(([, plan]) => "checkoutName" in plan).map(([id]) => id);
  it("has a name for each of the twelve in every language", () => {
    expect(linkPlans).toHaveLength(12);
    for (const lang of LANGS) for (const id of linkPlans) expect(planName(lang, id), `${lang} ${id}`).not.toBe(id);
  });
  it("knows their weekly price in Canadian dollars", () => {
    expect(planPriceMinor("ai", "cad")).toBe(4700);
    expect(planPriceMinor("goals", "cad")).toBe(4700);
    expect(planPriceMinor("library", "cad")).toBe(9700);
    expect(planPriceMinor("edit", "cad")).toBe(5900);
  });
});
