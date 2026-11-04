import { describe, expect, it, vi } from "vitest";
import { postLinkStatus, pushLinkStatus, signCallback, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "../src/links/callback.ts";
import type { LinkStatus } from "../src/links/link-status.ts";
import type { Env } from "../src/env.ts";
import { fakeD1 } from "./fake-d1.ts";

const STATUS: LinkStatus = { id: "ch1", status: "paid", product: "b51", amount: 5, currency: "ils", telegram_user_id: 7, checkout_status: "succeeded" };
const NOW = new Date("2026-11-04T12:00:00Z");

describe("signCallback", () => {
  it("signs timestamp and body with HMAC-SHA256 as hex", async () => {
    // Reference value: printf '1.{}' | openssl dgst -sha256 -hmac key
    expect(await signCallback("key", "1", "{}")).toBe("sha256=1ba6b8171186efc613e8bcc0cbdab2748f24984d7c5a84faa2637afa0e40d224");
    expect(await signCallback("key", "1", "{}")).not.toBe(await signCallback("key", "2", "{}"));
    expect(await signCallback("key", "1", "{}")).not.toBe(await signCallback("other", "1", "{}"));
  });
});

describe("postLinkStatus", () => {
  it("posts the status with a timestamp and a signature over both", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    await postLinkStatus({ url: "https://crx.example/hook", secret: "s", fetcher }, STATUS, NOW);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://crx.example/hook");
    expect(JSON.parse(String(init.body))).toEqual(STATUS);
    expect(headers[TIMESTAMP_HEADER]).toBe(String(NOW.getTime() / 1000));
    expect(headers[SIGNATURE_HEADER]).toBe(await signCallback("s", headers[TIMESTAMP_HEADER] ?? "", String(init.body)));
  });
  it("throws on a refused delivery", async () => {
    const fetcher = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(postLinkStatus({ url: "https://crx.example/hook", secret: "s", fetcher }, STATUS, NOW)).rejects.toThrow(/500/);
  });
});

describe("pushLinkStatus", () => {
  const envWith = (over: Partial<Env>, db: D1Database): Env => ({ DB: db, YMD_LINKS_SECRET: "s", CRX_STATUS_CALLBACK_URL: "", ...over }) as Env;
  it("does nothing when no callback URL is set or there is no checkout", async () => {
    const { db, calls } = fakeD1(() => undefined);
    await pushLinkStatus(envWith({}, db), "ch1", NOW);
    await pushLinkStatus(envWith({ CRX_STATUS_CALLBACK_URL: "https://crx.example/hook" }, db), null, NOW);
    expect(calls).toHaveLength(0);
  });
  it("skips checkouts that are not CRX links and never throws", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { db } = fakeD1(() => undefined);
    await pushLinkStatus(envWith({ CRX_STATUS_CALLBACK_URL: "https://crx.example/hook" }, db), "site-checkout", NOW);
    expect(fetchSpy).not.toHaveBeenCalled();
    const crx = fakeD1((call) => (call.sql.includes("FROM checkouts") ? { id: "ch1", item_ids: "b51", currency: "ils", amount: 500, polar_product_id: "p-b51", status: "succeeded", telegram_id: 7 } : undefined));
    await expect(pushLinkStatus(envWith({ CRX_STATUS_CALLBACK_URL: "https://crx.example/hook" }, crx.db), "ch1", NOW)).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalled();
    fetchSpy.mockRestore();
    errors.mockRestore();
  });
});
