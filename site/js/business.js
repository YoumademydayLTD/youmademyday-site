// Registered company details, given by the owner on 01.11.2026 (also public at the Israeli Companies Registrar).
export const BIZ = {
  name: "עשית לי את היום בע״מ",
  id: "ח.פ. 517347712",
  addr: "דוד אלעזר 10, חיפה",
  email: "youmademydayltd@gmail.com",
  hours: "א׳–ה׳, 9:00–17:00",
};

// The same details for the foreign-language sites. The Hebrew name stays the registered legal name.
const BIZ_INTL = {
  name: "You Made My Day Ltd. (עשית לי את היום בע״מ)",
  id: "Company no. 517347712 (Israel)",
  addr: "10 David Elazar St., Haifa, Israel",
  email: BIZ.email,
  hours: "Sun–Thu, 9:00–17:00 (Israel time)",
};
const ID_LABEL = { fr: "N° de société 517347712 (Israël)", ar: "رقم الشركة 517347712 (إسرائيل)", ru: "Рег. номер компании 517347712 (Израиль)" };

export const BRAND = "You Made My Day";

// Store policy constants (owner decisions, see the refunds and pricing pages).
export const REFUND_DAYS = 14;
export const REFUND_PAYOUT_DAYS = 14;
export const BOOK_DEAL_MIN = 3; // three books or more in the cart: the cheapest one is free

/** Business details as shown on a given language's site. */
export function BIZ_FOR(lang) {
  if (lang === "he") return BIZ;
  return { ...BIZ_INTL, id: ID_LABEL[lang] || BIZ_INTL.id };
}

/** The object the legal page modules receive. */
export const legalParams = (lang) => ({ ...BIZ_FOR(lang), brand: BRAND, refundDays: REFUND_DAYS, payoutDays: REFUND_PAYOUT_DAYS });
