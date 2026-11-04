-- Which sign-in a deep-link token is for: the site or the support center. A token made for one can never be
-- redeemed by the other's wait endpoint, so a site link cannot be turned into an admin session.
ALTER TABLE bot_logins ADD COLUMN scope TEXT NOT NULL DEFAULT 'site';
