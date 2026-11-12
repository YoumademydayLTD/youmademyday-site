// Weekly memberships sold only through payment links (link sales), never listed on the plans page.
// Owner, 12.11.2026: eleven separate weekly memberships at 47 CAD and one that opens the whole library at 97 CAD,
// each with the first day free. Every one is its own store product with its own content, so a buyer who holds
// several holds several different things: a studio opens one course and the books that go with it, a track
// opens one daily topic track in the bot and its books, the library opens everything
// (worker/src/view/plan-library.ts, bot/src/config/tracks.ts).
// `price` is the shekel catalogue price the payment provider requires in the default currency; the other
// currencies are in tools/currency_prices.json. `checkoutName` is the product's name on the payment page: these
// are bought abroad, where a Hebrew name would not be read, so it is English, short, and the same in every language.

const WEEKLY = { period: "week", trialDays: 1 };
const STUDIO_PRICE = 105;
const LIBRARY_PRICE = 219;

const studio = (id, checkoutName) => ({ id, price: STUDIO_PRICE, ...WEEKLY, checkoutName });

export const WEEKLY_LINK_PLANS = [
  studio("ai", "AI Studio"),
  studio("design", "Design Studio"),
  studio("sheets", "Sheets Studio"),
  studio("writing", "Writing Studio"),
  studio("photo", "Photo Studio"),
  studio("focus", "Focus Studio"),
  studio("social", "Social Studio"),
  studio("web", "Web Studio"),
  studio("calm", "Calm Track"),
  studio("confidence", "Confidence Track"),
  studio("goals", "Goals Track"),
  { id: "library", price: LIBRARY_PRICE, ...WEEKLY, checkoutName: "Full Library" },
];
