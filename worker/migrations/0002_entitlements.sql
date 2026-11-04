-- What each paid order gives its buyer: one row per delivered product (bundles are expanded to their books).
CREATE TABLE entitlements (
  order_id TEXT NOT NULL,
  checkout_id TEXT,
  customer_id TEXT,
  customer_email TEXT,
  product_id TEXT NOT NULL,          -- our store id, e.g. b9
  lang TEXT NOT NULL,                -- the buyer's site language; the file falls back to English, then Hebrew
  created_at TEXT NOT NULL,
  revoked_at TEXT,                   -- set when the order is refunded
  PRIMARY KEY (order_id, product_id)
);
CREATE INDEX entitlements_checkout ON entitlements (checkout_id);
CREATE INDEX entitlements_customer ON entitlements (customer_id);
