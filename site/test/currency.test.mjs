// Run: node --test site/test/currency.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseCurrency, regionCurrency } from "../js/currency-choice.js";

test("the Hebrew site is always in shekels", () => {
  assert.equal(chooseCurrency({ lang: "he", saved: "USD", locales: ["en-CA"] }), "ILS");
});

test("a saved choice wins over the browser and the language", () => {
  assert.equal(chooseCurrency({ lang: "en", saved: "GBP", locales: ["en-CA"] }), "GBP");
});

test("an unknown saved value is ignored", () => {
  assert.equal(chooseCurrency({ lang: "en", saved: "XYZ", locales: [] }), "USD");
  assert.equal(chooseCurrency({ lang: "en", saved: null, locales: [] }), "USD");
});

test("the browser's region picks the currency before the language does", () => {
  assert.equal(chooseCurrency({ lang: "fr", saved: null, locales: ["fr-CA", "fr"] }), "CAD");
  assert.equal(chooseCurrency({ lang: "en", saved: null, locales: ["en-GB"] }), "GBP");
  assert.equal(chooseCurrency({ lang: "en", saved: null, locales: ["en-AU"] }), "AUD");
  assert.equal(chooseCurrency({ lang: "ru", saved: null, locales: ["ru-IL"] }), "ILS");
  assert.equal(chooseCurrency({ lang: "en", saved: null, locales: ["de-DE"] }), "EUR");
});

test("without a known region the site language decides", () => {
  assert.equal(chooseCurrency({ lang: "fr", saved: null, locales: ["fr"] }), "EUR");
  assert.equal(chooseCurrency({ lang: "ar", saved: null, locales: ["ar"] }), "USD");
  assert.equal(chooseCurrency({ lang: "ru", saved: null, locales: ["ru-RU"] }), "USD");
});

test("regionCurrency skips tags without a region and broken tags", () => {
  assert.equal(regionCurrency(["en", "not a tag", "en-CA"]), "CAD");
  assert.equal(regionCurrency([]), null);
});
