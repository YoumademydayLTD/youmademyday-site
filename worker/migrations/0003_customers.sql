-- Our customers: one per Telegram user, with an internal running number ym0001, ym0002, ... (owner, 04.11.2026).
-- The number is allocated once from the row id, never derived from a name or a Telegram id, and is never shown
-- to the customer. It is the Polar customer's external_id. ym0000 is a demo customer on Polar and is not ours.
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ym TEXT UNIQUE,                    -- "ym" + id padded to 4 digits; set right after the insert
  telegram_id INTEGER NOT NULL UNIQUE,
  polar_customer_id TEXT UNIQUE,
  created_at TEXT NOT NULL
);

ALTER TABLE checkouts ADD COLUMN customer_ym TEXT;
CREATE INDEX checkouts_customer ON checkouts (customer_ym);

-- What a membership costs per period, from Polar's subscription (minor units), for the personal area.
ALTER TABLE subscriptions ADD COLUMN amount INTEGER;
ALTER TABLE subscriptions ADD COLUMN currency TEXT;
