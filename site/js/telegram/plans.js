// Subscription plans and topic tracks. Names, lists and blurbs live in the dictionaries
// (plan.<id>.*, track.<id>.*); this file holds only the data that is the same in every language.
// Prices are placeholders until the owner sets them (04.11.2026).

export const PLANS = [
  { id: "spark", price: 0, tone: "ghost" },
  { id: "day", price: 29, tone: "tg" },
  { id: "community", price: 59, tone: "tg", isFeatured: true },
  { id: "mentor", price: 149, tone: "ghost" },
];

export const TRACKS = [
  { id: "confidence", days: 30, glow: "rgba(255,206,226,.9)" },
  { id: "couples", days: 30, glow: "rgba(196,224,255,.95)" },
  { id: "habits", days: 21, glow: "rgba(214,200,255,.95)" },
  { id: "money", days: 30, glow: "rgba(255,222,200,.95)" },
  { id: "calm", days: 14, glow: "rgba(200,240,222,.95)" },
  { id: "goals", days: 90, glow: "rgba(255,236,190,.95)" },
];
