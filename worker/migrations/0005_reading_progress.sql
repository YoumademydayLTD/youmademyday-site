-- Lessons and chapters a customer marked as done in the site's reader. Keyed by Telegram id (every buyer signs in
-- with Telegram), so the bot can read the same progress.
CREATE TABLE reading_progress (
  telegram_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  unit_n INTEGER NOT NULL,
  done_at TEXT NOT NULL,
  PRIMARY KEY (telegram_id, product_id, unit_n)
);
