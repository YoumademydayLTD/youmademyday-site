import { describe, expect, it } from "vitest";
import { secretKey, sign, verifyWebhook, TOLERANCE_SECONDS } from "../src/webhook/verify.ts";

const NOW = 1_762_300_000;
const BODY = '{"type":"order.paid","data":{"id":"o1"}}';
const ID = "msg_2abc";
const RAW_SECRET = "polar_whs_test_secret_value";
const WHSEC = `whsec_${btoa("standard-webhooks-key-bytes")}`;

async function headersFor(secret: string, timestamp = NOW, body = BODY) {
  const sig = await sign(secretKey(secret), ID, String(timestamp), body);
  return { id: ID, timestamp: String(timestamp), signature: `v1,${sig}` };
}

describe("verifyWebhook", () => {
  it("accepts a correct signature with a raw (Polar) secret", async () => {
    expect(await verifyWebhook(await headersFor(RAW_SECRET), BODY, RAW_SECRET, NOW)).toEqual({ ok: true });
  });
  it("accepts a correct signature with a whsec_ base64 secret", async () => {
    expect(await verifyWebhook(await headersFor(WHSEC), BODY, WHSEC, NOW)).toEqual({ ok: true });
  });
  it("matches the Standard Webhooks reference vector", async () => {
    // From the Standard Webhooks spec test suite.
    const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
    const body = '{"test": 2432232314}';
    const sig = await sign(secretKey(secret), "msg_p5jXN8AQM9LWM0D4loKWxJek", "1614265330", body);
    expect(sig).toBe("g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");
  });
  it("accepts when any one of several signatures matches (secret rotation)", async () => {
    const good = await headersFor(RAW_SECRET);
    const headers = { ...good, signature: `v1,AAAA ${good.signature}` };
    expect((await verifyWebhook(headers, BODY, RAW_SECRET, NOW)).ok).toBe(true);
  });
  it("rejects a changed body", async () => {
    expect(await verifyWebhook(await headersFor(RAW_SECRET), `${BODY} `, RAW_SECRET, NOW)).toEqual({ ok: false, reason: "signature mismatch" });
  });
  it("rejects the wrong secret", async () => {
    expect((await verifyWebhook(await headersFor("other"), BODY, RAW_SECRET, NOW)).ok).toBe(false);
  });
  it("rejects an old or future timestamp", async () => {
    const old = NOW - TOLERANCE_SECONDS - 1;
    expect(await verifyWebhook(await headersFor(RAW_SECRET, old), BODY, RAW_SECRET, NOW)).toEqual({ ok: false, reason: "timestamp outside the tolerance" });
    const future = NOW + TOLERANCE_SECONDS + 1;
    expect((await verifyWebhook(await headersFor(RAW_SECRET, future), BODY, RAW_SECRET, NOW)).ok).toBe(false);
  });
  it("rejects missing headers, an unknown version and an empty secret", async () => {
    const good = await headersFor(RAW_SECRET);
    expect((await verifyWebhook({ ...good, signature: null }, BODY, RAW_SECRET, NOW)).ok).toBe(false);
    expect((await verifyWebhook({ ...good, signature: good.signature.replace("v1,", "v2,") }, BODY, RAW_SECRET, NOW)).ok).toBe(false);
    expect((await verifyWebhook(good, BODY, "", NOW)).ok).toBe(false);
  });
});
