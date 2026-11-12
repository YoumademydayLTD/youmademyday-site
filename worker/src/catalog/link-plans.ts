// What each weekly link plan opens in the personal area (store plan id → catalogue items).
// Owner, 12.11.2026: eleven weekly memberships sold only through payment links, each a different store product, so a
// buyer who holds several holds several different things. A studio is one course with the books that go with it; a
// track is one daily topic track in the bot (bot/src/config/tracks.ts) with its books. Every item is sold on the
// English site too, because these plans are bought abroad. The blurbs in site/js/i18n/<lang>/link-plans.js name the
// same items; test/link-plans.test.ts keeps the lists real and different from each other.
export const LINK_PLAN_ITEMS: Readonly<Record<string, readonly string[]>> = {
  ai: ["c1", "b9", "b10"],
  design: ["c2", "b26", "b37"],
  sheets: ["c3", "b18", "b20", "b59"],
  writing: ["c4", "b12", "b13", "b70"],
  photo: ["c5", "b28", "b67", "b68"],
  focus: ["c6", "b21", "b55", "b56"],
  social: ["c7", "b11", "b19", "b14"],
  web: ["c8", "b17", "b73"],
  calm: ["b23", "b24", "b48", "b74"],
  confidence: ["b46", "b16", "b71", "b72"],
  goals: ["b51", "b15", "b22"],
};

// The weekly link plan that opens the whole library (and every track in the bot), like Growth and Maximum do.
export const LIBRARY_LINK_PLAN = "library";
