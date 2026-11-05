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
} as const;
