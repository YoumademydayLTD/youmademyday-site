// Fixed copy and picks for the home page. Product ids refer to site/js/products/<lang>.js.

export const HERO_FAN = ["b31", "c4", "b51", "b9", "c1"]; // left to right on screen; the middle one (the flagship) faces forward
export const FLAGSHIP_BOOK = "b51"; // the 5 ₪ / $2 book, the store's main hook (owner, 04.11.2026)
export const TILE_COURSE = "c1";
export const TILE_BOOKS = ["b28", "b9", "b31"];
export const TILE_DEAL = ["b23", "b32", "b28"];
export const HOME_COURSES = ["c1", "c2", "c3", "c4"];
export const HOME_SHELF = ["b9", "b31", "b23", "b17", "b28", "b19"];
export const OPEN_BOOK = "b31"; // the pinned scene opens this book on its real first pages

// Topic "worlds": several catalog categories under one card (titles and blurbs in the "home.worlds" dictionary list,
// same order). Categories are matched by product number, so this works for every language.
export const WORLDS = [
  { nums: [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 18, 19, 49], book: "c1", glow: "#FFE3EE,#F1EAFF" },
  { nums: [30, 31, 32, 33, 34, 35, 36, 37, 38, 50], book: "b31", glow: "#FFEDE3,#FFF6EE" },
  { nums: [14, 15, 16, 17, 46], book: "b15", glow: "#ECE6FF,#F6F2FF" },
  { nums: [23, 24, 25, 26, 27], book: "b25", glow: "#FFF0E6,#FFE7F0" },
  { nums: [5, 6, 20, 21, 22, 28, 29], book: "b22", glow: "#E6F0FF,#F3EEFF" },
  { nums: [39, 40, 41, 42, 43, 44, 45, 47, 48], book: "b42", glow: "#E3F4EC,#EEF7FF" },
];

export const PROMISE_ICONS = ["i-pen", "i-plane", "i-device", "i-shield"];
