-- The «open in the real browser» bounce for CRX links (05.11.2026): GET /go/<go_id> sends the buyer to the Polar
-- payment page the store created. Polar's page URL carries a client secret, not the checkout id, so it is stored here;
-- go_id is a short random id, so the public link never reveals the checkout id.
ALTER TABLE checkouts ADD COLUMN url TEXT;
ALTER TABLE checkouts ADD COLUMN go_id TEXT;
CREATE UNIQUE INDEX checkouts_go_id ON checkouts (go_id);
