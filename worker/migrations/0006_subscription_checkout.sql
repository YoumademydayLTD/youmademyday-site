-- The checkout that started a membership (Polar's Subscription.checkout_id), so a CRX link's status can find its
-- membership during the free day, before any paid order exists.
ALTER TABLE subscriptions ADD COLUMN checkout_id TEXT;
CREATE INDEX subscriptions_checkout ON subscriptions (checkout_id);
