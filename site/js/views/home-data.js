// Fixed copy and picks for the home page. Product ids refer to site/js/products.js.

export const HERO_FAN = ["b31", "c4", "c1", "b9", "b23"]; // left to right on screen; the middle one faces forward
export const TILE_COURSE = "c1";
export const TILE_BOOKS = ["b44", "b9", "b31"];
export const TILE_DEAL = ["b23", "b32", "b44"];
export const HOME_COURSES = ["c1", "c2", "c3", "c4"];
export const HOME_SHELF = ["b9", "b31", "b23", "b17", "b44", "b19"];
export const OPEN_BOOK = "b31"; // the pinned scene opens this book on its real first pages

export const STATEMENT = "בלי וידאו של שלוש שעות. בלי מנוי. רק עמודים טובים, שכתבנו בשבילך, שאפשר לפתוח הערב.";

// Topic "worlds": several catalog categories under one card. Glow = two soft palette tints.
export const WORLDS = [
  { title: "עסק, שיווק וטכנולוגיה", text: "בינה מלאכותית, קופירייטינג, אינסטגרם ואקסל.", cats: ["טכנולוגיה", "שיווק", "עסקים", "עיצוב"], book: "c1", glow: "#FFE3EE,#F1EAFF" },
  { title: "מטבח ובית", text: "לחם, ארוחות של 20 דקות וגינה במרפסת.", cats: ["בישול", "בית"], book: "b31", glow: "#FFEDE3,#FFF6EE" },
  { title: "קריירה", text: "קורות חיים, ראיון עבודה, לינקדאין ופרילנס.", cats: ["קריירה"], book: "b15", glow: "#ECE6FF,#F6F2FF" },
  { title: "כתיבה ויצירה", text: "יומנים, סיפור קצר, סקיצות וקליגרפיה.", cats: ["כתיבה", "יצירה"], book: "b25", glow: "#FFF0E6,#FFE7F0" },
  { title: "זמן, צילום והרגלים", text: "תכנון שבוע, הרגלים קטנים וצילום בטלפון.", cats: ["פרודוקטיביות", "צילום"], book: "b22", glow: "#E6F0FF,#F3EEFF" },
  { title: "משפחה, טיולים ותנועה", text: "מסלולים בארץ, משחקים בלי מסך וריצה.", cats: ["משפחה", "טיולים", "תנועה", "שפות"], book: "b42", glow: "#E3F4EC,#EEF7FF" },
];

export const CAPTIONS = [
  ["עימוד של ספר אמיתי", "אותיות גדולות, מרווחים נוחים, נעים לעין"],
  ["תרגילים ממש בתוך הדף", "שורות כתיבה, טבלאות וצ׳ק-ליסטים להדפסה"],
  ["הצצה חינם לפני שקונים", "לכל ספר יש פרק לדוגמה בעמוד שלו"],
];

export const PROMISES = [
  ["i-pen", "כתוב אצלנו", "כל קורס וכל ספר נכתבו והופקו על ידינו."],
  ["i-bolt", "מיד במייל", "קישור הורדה וחשבונית דקה אחרי התשלום."],
  ["i-device", "שלך לתמיד", "בכל מכשיר, בלי מנוי ובלי תאריך תפוגה."],
  ["i-shield", "14 יום להחזר", "בקורסים החזר מלא, בלי שאלות."],
];
