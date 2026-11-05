// Subscription plans and topic tracks. Names, lists and blurbs live in the dictionaries
// (plan.<id>.*, track.<id>.*); this file holds only the data that is the same in every language.
// Owner, 04.11.2026: the two weekly plans are the main offer and get the most room; the smaller monthly
// plans stay below them. Monthly prices are still placeholders.

export const PERIOD_DAYS = { week: 7, month: 30 };

/** The main offer: weekly, first day free, priced in shekels and dollars. */
export const FEATURED_PLANS = [
  { id: "grow", price: 147, usd: 39, period: "week", trialDays: 1 },
  { id: "max", price: 297, usd: 79, period: "week", trialDays: 1, isFeatured: true },
];

export const PLANS = [
  { id: "spark", price: 0, period: "month", tone: "ghost" },
  { id: "day", price: 29, period: "month", tone: "tg" },
  { id: "community", price: 59, period: "month", tone: "tg", isFeatured: true },
  { id: "mentor", price: 149, period: "month", tone: "ghost" },
];

/**
 * Plans sold only through payment links (CRX, store id plan-<id>), never listed on the plans page.
 * Owner, 05.11.2026: the editing course «סטודיו העריכה» is a weekly membership with the first day free;
 * the link price is 100 GEL a week (worker/src/catalog/link-prices.ts), the shekel price is the catalogue price
 * Polar requires in the default currency. `describeOnCheckout`: the payment page shows the plan's blurb, not only its name.
 */
export const LINK_PLANS = [
  { id: "edit", price: 129, period: "week", trialDays: 1, describeOnCheckout: true },
];

export const ALL_PLANS = Object.fromEntries([...FEATURED_PLANS, ...PLANS, ...LINK_PLANS].map((p) => [p.id, p]));

export const TRACKS = [
  { id: "confidence", days: 30, glow: "rgba(255,206,226,.9)" },
  { id: "couples", days: 30, glow: "rgba(196,224,255,.95)" },
  { id: "habits", days: 21, glow: "rgba(214,200,255,.95)" },
  { id: "money", days: 30, glow: "rgba(255,222,200,.95)" },
  { id: "calm", days: 14, glow: "rgba(200,240,222,.95)" },
  { id: "goals", days: 90, glow: "rgba(255,236,190,.95)" },
];
