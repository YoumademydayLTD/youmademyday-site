// Per-visitor state: cart and wishlist live in the browser only.

const KEY_PREFIX = "ymd-";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // storage blocked (private mode): keep working in memory
  }
}

function write(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // storage blocked: the cart still works for this visit
  }
}

export const S = {
  cart: read("cart", []),
  wish: read("wish", []),
  query: "",
  filters: {
    courses: { cat: "*", maxPrice: null, sort: "rec" },
    books: { cat: "*", maxPrice: null, sort: "rec" },
  },
  goCancel: false,
};

export function save() {
  write("cart", S.cart);
  write("wish", S.wish);
}
