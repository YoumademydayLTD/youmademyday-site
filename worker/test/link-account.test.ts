import { describe, expect, it, vi } from "vitest";
import { handleLinkAccount } from "../src/links/account.ts";
import worker from "../src/index.ts";
import type { Env } from "../src/env.ts";
import { fakeD1, type Answer } from "./fake-d1.ts";

const SECRET = "links-secret";
const NOW = new Date("2026-11-12T12:00:00Z");
const TELEGRAM_ID = 555_000_111;
const row = { id: 42, ym: "ym0042", telegram_id: TELEGRAM_ID, polar_customer_id: null, country: null };

function envWith(answer: Answer) {
  const d1 = fakeD1(answer);
  const bot = vi.fn(async () => new Response("{}"));
  const env = { DB: d1.db, BOT: { fetch: bot }, YMD_LINKS_SECRET: SECRET, SITE_URL: "https://youmademyday.store", EXTRA_ORIGINS: "" } as unknown as Env;
  return { env, calls: d1.calls, bot };
}
const found: Answer = (call) => (call.sql.includes("FROM customers WHERE telegram_id") ? row : undefined);
const post = (body: unknown, secret = SECRET) =>
  new Request("https://store.test/api/links/accounts", { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body: JSON.stringify(body) });

describe("POST /api/links/accounts", () => {
  it("opens the store account silently: one customers row, no provider call, no message", async () => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);
    const { env, calls, bot } = envWith(found);
    const reply = await handleLinkAccount(post({ telegram_user_id: TELEGRAM_ID }), env, NOW);
    vi.unstubAllGlobals();
    expect(reply).toEqual({ telegram_user_id: TELEGRAM_ID, account: "ready" });
    const insert = calls.find((c) => c.sql.startsWith("INSERT INTO customers"));
    expect(insert?.sql).toContain("ON CONFLICT(telegram_id) DO NOTHING");
    expect(insert?.args).toEqual([TELEGRAM_ID, NOW.toISOString()]);
    expect(provider).not.toHaveBeenCalled();
    expect(bot).not.toHaveBeenCalled();
  });
  it("answers the same for an account that already exists, and never returns the internal number", async () => {
    const { env } = envWith(found);
    const first = await handleLinkAccount(post({ telegram_user_id: TELEGRAM_ID }), env, NOW);
    const second = await handleLinkAccount(post({ telegram_user_id: String(TELEGRAM_ID) }), env, NOW);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).not.toContain("ym");
  });
  it("needs a positive whole Telegram id", async () => {
    const { env, calls } = envWith(found);
    for (const bad of [{}, { telegram_user_id: null }, { telegram_user_id: 0 }, { telegram_user_id: -5 }, { telegram_user_id: 1.5 }, { telegram_user_id: "abc" }]) {
      await expect(handleLinkAccount(post(bad), env, NOW)).rejects.toMatchObject({ code: "bad_request" });
    }
    expect(calls).toHaveLength(0);
  });
  it("refuses a wrong secret before reading the body", async () => {
    const { env, calls } = envWith(found);
    await expect(handleLinkAccount(post({ telegram_user_id: TELEGRAM_ID }, "wrong"), env, NOW)).rejects.toMatchObject({ code: "unauthorized" });
    expect(calls).toHaveLength(0);
  });
  it("is routed, apart from the status route of a link", async () => {
    const { env } = envWith(found);
    const response = await worker.fetch(post({ telegram_user_id: TELEGRAM_ID }), env, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ telegram_user_id: TELEGRAM_ID, account: "ready" });
    const unauthorized = await worker.fetch(post({ telegram_user_id: TELEGRAM_ID }, "wrong"), env, {} as ExecutionContext);
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toMatchObject({ error: "unauthorized" });
  });
});
