-- Telegram bot tables. They live in the store's D1 database next to the store tables (read-only for the bot)
-- and all start with bot_. Times are ISO-8601 UTC strings unless the column says otherwise.

-- One row per Telegram update already handled: Telegram resends an update until it gets a 200, so this dedupes.
CREATE TABLE bot_updates (
  update_id INTEGER PRIMARY KEY,
  received_at TEXT NOT NULL
);

CREATE TABLE bot_users (
  telegram_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT,
  username TEXT,
  lang TEXT NOT NULL,                     -- he | en | fr | ar | ru (from Telegram's language_code, switchable)
  time_zone TEXT NOT NULL,                -- IANA zone for the daily message
  daily_hour INTEGER NOT NULL DEFAULT 8,  -- local hour of the daily message
  daily_paused INTEGER NOT NULL DEFAULT 0,
  daily_silent INTEGER NOT NULL DEFAULT 0, -- 1 = sent without sound
  news_opt_in INTEGER NOT NULL DEFAULT 0,  -- non-essential updates and offers; off until the user turns it on
  track TEXT,                              -- the daily-message track; NULL until the user joins one (Spark is free)
  track_day INTEGER NOT NULL DEFAULT 1,    -- the next day of the track to send
  last_daily_date TEXT,                    -- local date (YYYY-MM-DD) of the last daily message
  streak INTEGER NOT NULL DEFAULT 0,
  last_done_date TEXT,                     -- local date of the last «done»
  is_blocked INTEGER NOT NULL DEFAULT 0,   -- 1 after Telegram says the user blocked the bot
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Site and admin sign-in: a deep-link token (kind=link) or a 6-digit code from /login (kind=code). Single use, 5 minutes.
CREATE TABLE bot_logins (
  id TEXT PRIMARY KEY,                     -- the link token, or "code:<digits>"
  kind TEXT NOT NULL,
  telegram_id INTEGER,                     -- set when the user confirms (link) or asks for the code (code)
  status TEXT NOT NULL,                    -- pending | confirmed | used
  expires_at INTEGER NOT NULL,             -- unix seconds
  created_at TEXT NOT NULL
);
CREATE INDEX bot_logins_expiry ON bot_logins (expires_at);

-- Failed code attempts per client, so 6 digits cannot be guessed by brute force.
CREATE TABLE bot_login_attempts (
  client TEXT NOT NULL,
  at INTEGER NOT NULL                      -- unix seconds
);
CREATE INDEX bot_login_attempts_client ON bot_login_attempts (client, at);

CREATE TABLE bot_sessions (
  token_hash TEXT PRIMARY KEY,             -- SHA-256 of the session token; the token itself is never stored
  telegram_id INTEGER NOT NULL,
  scope TEXT NOT NULL,                     -- site | admin
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX bot_sessions_user ON bot_sessions (telegram_id);

CREATE TABLE bot_admins (
  telegram_id INTEGER PRIMARY KEY,
  claimed_at TEXT NOT NULL
);

-- A paid order linked to the Telegram user who opened the bot from its thanks page (first link wins).
CREATE TABLE bot_order_links (
  checkout_id TEXT PRIMARY KEY,
  telegram_id INTEGER NOT NULL,
  order_id TEXT,
  delivered_at TEXT,                       -- NULL until the files were sent; the cron retries pending ones
  linked_at TEXT NOT NULL
);
CREATE INDEX bot_order_links_user ON bot_order_links (telegram_id);

CREATE TABLE bot_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT NOT NULL,
  day_n INTEGER NOT NULL,
  lang TEXT NOT NULL,
  text TEXT NOT NULL,
  lesson_url TEXT,                         -- shown as the «lesson of the day» button when set
  lesson_label TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (track, day_n, lang)
);

-- Messages waiting to be sent at a paced rate (daily messages, evening reminders, charge reminders).
CREATE TABLE bot_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                      -- daily | evening | charge
  payload TEXT NOT NULL,                   -- JSON: what to send
  send_after INTEGER NOT NULL,             -- unix seconds
  attempts INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT UNIQUE,                  -- e.g. charge:<subscription>:<period end>
  done_at TEXT,                            -- sent or given up; the row stays a while so its dedupe key still blocks copies
  created_at TEXT NOT NULL
);
CREATE INDEX bot_outbox_due ON bot_outbox (done_at, send_after);

CREATE TABLE bot_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  status TEXT NOT NULL,                    -- open | resolved
  unread INTEGER NOT NULL DEFAULT 0,       -- customer messages the admin has not opened yet
  is_acked INTEGER NOT NULL DEFAULT 0,     -- the one auto-ack of this thread was sent
  last_text TEXT NOT NULL DEFAULT '',
  last_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX bot_threads_user ON bot_threads (telegram_id, status);
CREATE INDEX bot_threads_inbox ON bot_threads (status, last_at);

CREATE TABLE bot_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  direction TEXT NOT NULL,                 -- in (customer) | out (team)
  text TEXT NOT NULL DEFAULT '',
  media_kind TEXT,                         -- photo | document | voice | video | sticker
  file_id TEXT,
  file_name TEXT,
  telegram_message_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX bot_messages_thread ON bot_messages (thread_id, id);

-- The admin's copy of each support notification, so a Telegram reply to it reaches the right customer.
CREATE TABLE bot_admin_notices (
  admin_chat_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  thread_id INTEGER NOT NULL,
  PRIMARY KEY (admin_chat_id, message_id)
);

CREATE TABLE bot_quick_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Small key-value settings (e.g. that the admin claim code was used).
CREATE TABLE bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
