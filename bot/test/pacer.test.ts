import { describe, expect, it } from "vitest";
import { GLOBAL_PER_SECOND, markSent, newPacer, nextSlot, pauseFor, PER_CHAT_INTERVAL_MS } from "../src/outbox/pacer.ts";

describe("send pacer", () => {
  it("spaces messages to one chat by a second", () => {
    const pacer = newPacer();
    expect(nextSlot(pacer, 1, 0)).toBe(0);
    markSent(pacer, 1, 0);
    expect(nextSlot(pacer, 1, 10)).toBe(PER_CHAT_INTERVAL_MS);
    expect(nextSlot(pacer, 2, 10)).toBe(10);
  });

  it("keeps the overall rate under the global limit", () => {
    const pacer = newPacer();
    let now = 0;
    const times: number[] = [];
    for (let chat = 0; chat < GLOBAL_PER_SECOND * 3; chat += 1) {
      now = nextSlot(pacer, chat, now);
      markSent(pacer, chat, now);
      times.push(now);
    }
    for (const t of times) expect(times.filter((x) => x > t - 1000 && x <= t).length).toBeLessThanOrEqual(GLOBAL_PER_SECOND);
    expect(times.at(-1)).toBeGreaterThanOrEqual(2000);
  });

  it("waits out a 429 retry_after for every chat", () => {
    const pacer = newPacer();
    pauseFor(pacer, 7, 1000);
    expect(nextSlot(pacer, 5, 1000)).toBe(8000);
    pauseFor(pacer, 1, 1000); // a shorter pause never shortens the block
    expect(nextSlot(pacer, 6, 2000)).toBe(8000);
  });
});
