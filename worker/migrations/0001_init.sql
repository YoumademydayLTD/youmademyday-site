-- Store payments: our record of Polar checkouts, orders and subscriptions, plus every webhook received.
CREATE TABLE checkouts (
  id TEXT PRIMARY KEY,               -- Polar checkout id
  source TEXT NOT NULL,              -- site | crx | polar (created elsewhere, seen by webhook)
  kind TEXT NOT NULL,                -- cart | product | plan | link
  item_ids TEXT NOT NULL,            -- comma-separated store ids
  lang TEXT,
  currency TEXT NOT NULL,
  amount INTEGER NOT NULL,           -- minor units, tax included
  polar_product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,               -- Polar order id
  checkout_id TEXT,
  customer_id TEXT,
  customer_email TEXT,
  product_id TEXT,
  subscription_id TEXT,
  status TEXT NOT NULL,
  billing_reason TEXT,
  currency TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  item_ids TEXT NOT NULL DEFAULT '',
  lang TEXT,
  needs_review INTEGER NOT NULL DEFAULT 0, -- 1 when we cannot tell what was bought (e.g. a store order without item ids)
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX orders_customer ON orders (customer_id);
CREATE INDEX orders_checkout ON orders (checkout_id);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,               -- Polar subscription id
  customer_id TEXT,
  customer_email TEXT,
  product_id TEXT,
  plan_id TEXT,                      -- our plan id (grow, max, ...) when the product is one of ours
  status TEXT NOT NULL,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at TEXT,
  ended_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
CREATE INDEX subscriptions_customer ON subscriptions (customer_id);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,               -- the webhook-id header: Polar retries with the same id, so this dedupes
  type TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  error TEXT,
  payload TEXT NOT NULL
);
