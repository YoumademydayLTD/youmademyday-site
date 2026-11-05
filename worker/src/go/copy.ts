// The bounce page's Hebrew texts (CRX buyers are Hebrew speakers; the page has no other language yet).
export const GO_COPY = {
  title: "מעבר לתשלום",
  android: {
    heading: "פותחים את דף התשלום בכרום",
    // The no-break space keeps «Google Pay» on one line inside the right-to-left sentence.
    body: "בכרום התשלום עובר חלק, גם עם Google\u00A0Pay.",
    button: "פתח בכרום",
    stay: "או המשך כאן",
  },
  ios: {
    heading: "פותחים את דף התשלום",
    body: "עוד רגע זה נפתח.",
    button: "המשך לתשלום",
  },
  missing: {
    heading: "הקישור הזה לא פעיל",
    body: "אפשר לבקש קישור חדש בצ'אט.",
  },
  // A reusable link (GET /buy/:slug): what a link preview sees, and what a buyer sees if Polar did not open a page.
  preview: {
    heading: "מעבר לתשלום",
    body: "דף התשלום נפתח בלחיצה.",
    button: "המשך לתשלום",
  },
  failed: {
    heading: "דף התשלום לא נפתח",
    body: "נסו שוב בעוד רגע.",
    button: "לנסות שוב",
  },
} as const;
