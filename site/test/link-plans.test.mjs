// Run: node --test site/test/link-plans.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_PLANS, FEATURED_PLANS, LINK_PLANS, PLANS } from "../js/telegram/plans.js";
import { WEEKLY_LINK_PLANS } from "../js/telegram/link-plans.js";
import { LIVE } from "../js/i18n/config.js";

const dictionaries = Object.fromEntries(await Promise.all(LIVE.map(async (lang) => [lang, (await import(`../js/i18n/${lang}/ui.js`)).default])));
const STUDIO_PRICES = { usd: 33, cad: 47, eur: 29, gbp: 25, aud: 49 };
const LIBRARY_PRICES = { usd: 69, cad: 97, eur: 59, gbp: 49, aud: 99 };

test("twelve weekly link plans: eleven at 47 CAD and the library at 97 CAD, first day free", () => {
  assert.equal(WEEKLY_LINK_PLANS.length, 12);
  for (const { id } of WEEKLY_LINK_PLANS) {
    const plan = ALL_PLANS[id];
    assert.equal(plan.period, "week", id);
    assert.equal(plan.trialDays, 1, id);
    assert.deepEqual(plan.prices, id === "library" ? LIBRARY_PRICES : STUDIO_PRICES, id);
    assert.equal(plan.price, id === "library" ? 219 : 105, id);
  }
});

test("each has its own short English payment-page name", () => {
  const names = WEEKLY_LINK_PLANS.map((plan) => plan.checkoutName);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) assert.match(name, /^[A-Za-z ]{3,20}$/);
});

test("they are link-only: never on the plans page, and no id of an existing plan is reused", () => {
  const listed = new Set([...FEATURED_PLANS, ...PLANS].map((plan) => plan.id));
  for (const { id } of WEEKLY_LINK_PLANS) assert.equal(listed.has(id), false, id);
  assert.equal(new Set(LINK_PLANS.map((plan) => plan.id)).size, LINK_PLANS.length);
  assert.equal(LINK_PLANS.length, WEEKLY_LINK_PLANS.length + 1); // plus the editing course
});

test("the plans sold before keep their prices", () => {
  assert.deepEqual({ price: ALL_PLANS.edit.price, cad: ALL_PLANS.edit.prices.cad, trialDays: ALL_PLANS.edit.trialDays }, { price: 129, cad: 59, trialDays: 1 });
  assert.deepEqual({ price: ALL_PLANS.max.price, usd: ALL_PLANS.max.usd, cad: ALL_PLANS.max.prices.cad }, { price: 297, usd: 79, cad: 109 });
  assert.deepEqual({ price: ALL_PLANS.grow.price, usd: ALL_PLANS.grow.usd, cad: ALL_PLANS.grow.prices.cad }, { price: 147, usd: 39, cad: 55 });
  assert.equal(ALL_PLANS.edit.checkoutName, undefined);
});

test("every language names and describes each link plan", () => {
  for (const lang of LIVE) {
    for (const { id } of WEEKLY_LINK_PLANS) {
      for (const key of [`plan.${id}.name`, `plan.${id}.sub`]) {
        const text = dictionaries[lang][key];
        assert.equal(typeof text, "string", `${lang} ${key}`);
        assert.ok(text.trim().length > 2, `${lang} ${key}`);
      }
    }
  }
});

test("the dictionaries still carry the texts they had (the spread adds, never replaces)", () => {
  for (const lang of LIVE) {
    assert.equal(typeof dictionaries[lang]["plan.edit.name"], "string", lang);
    assert.equal(typeof dictionaries[lang]["plan.max.title"], "string", lang);
    assert.equal(typeof dictionaries[lang]["plans.moreA"], "string", lang);
  }
});
