import { describe, expect, it } from "vitest";
import { matchRoute, ROUTES } from "../src/app/router.ts";
import { parseCommand } from "../src/bot/commands.ts";
import { allowedOrigins, corsHeaders } from "../src/http/cors.ts";
import { extractMedia } from "../src/support/media.ts";
import { formatCharge } from "../src/billing/charge-format.ts";
import { planPriceMinor } from "../src/billing/plan-price.ts";
import { canReceive, findTrack } from "../src/config/tracks.ts";
import { langFromTelegram, sitePage } from "../src/config/langs.ts";
import { parseDayData } from "../src/daily/message.ts";

describe("router", () => {
  it("matches paths with parameters and the right access", () => {
    const m = matchRoute("POST", "/api/admin/threads/12/reply");
    expect(m?.params).toEqual({ id: "12" });
    expect(m?.route.access).toBe("admin");
    expect(matchRoute("GET", "/api/admin/threads/12/reply")).toBeNull();
    expect(matchRoute("POST", "/api/login/start")?.route.access).toBe("site");
    expect(matchRoute("GET", "/admin/")).toBeNull();
  });

  it("guards every admin data route", () => {
    const open = ROUTES.filter((r) => r.pattern.startsWith("/api/admin/") && !r.pattern.startsWith("/api/admin/login/") && r.access !== "admin");
    expect(open.map((r) => r.pattern).sort()).toEqual(["/api/admin/logout", "/api/admin/me"]); // both check the cookie themselves
    expect(matchRoute("GET", "/admin/file/abc")?.route.access).toBe("admin");
  });
});

describe("commands and callbacks", () => {
  it("parses commands with a bot name and arguments", () => {
    expect(parseCommand("/start@youmademydaystore_bot order-x")).toEqual({ name: "start", args: "order-x" });
    expect(parseCommand("/admin  code123 ")).toEqual({ name: "admin", args: "code123" });
    expect(parseCommand("hello")).toBeNull();
    expect(parseDayData("done:spark:3")).toEqual({ track: "spark", day: 3 });
    expect(parseDayData("done:spark:x")).toBeNull();
  });
});

describe("cors", () => {
  const allowed = allowedOrigins({ siteUrl: "https://youmademyday.store", extraOrigins: "http://127.0.0.1:4322" });
  it("allows the site and the preview, with the Authorization header", () => {
    expect(corsHeaders("https://youmademyday.store", allowed)["Access-Control-Allow-Headers"]).toContain("Authorization");
    expect(corsHeaders("http://127.0.0.1:4322", allowed)["Access-Control-Allow-Origin"]).toBe("http://127.0.0.1:4322");
    expect(corsHeaders("https://evil.example", allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});

describe("helpers", () => {
  it("keeps the largest photo and document names", () => {
    const base = { message_id: 1, chat: { id: 1, type: "private" as const }, date: 0 };
    expect(extractMedia({ ...base, caption: "hi", photo: [{ file_id: "s", file_unique_id: "s", width: 1, height: 1 }, { file_id: "l", file_unique_id: "l", width: 9, height: 9 }] }))
      .toEqual({ text: "hi", mediaKind: "photo", fileId: "l", fileName: null });
    expect(extractMedia({ ...base, document: { file_id: "d", file_name: "a.pdf" } }).fileName).toBe("a.pdf");
    expect(extractMedia({ ...base, text: "plain" }).mediaKind).toBeNull();
  });

  it("formats charges and finds plan prices", () => {
    expect(formatCharge("en", "2026-11-10T08:00:00Z", 14700, "ils").amount).toContain("147");
    expect(planPriceMinor("grow", "ils")).toBe(14700);
    expect(planPriceMinor("grow", "usd")).toBe(3900);
    expect(planPriceMinor("day", "usd")).toBeNull();
    expect(planPriceMinor("nope", "ils")).toBeNull();
  });

  it("gates member tracks by active plans", () => {
    const spark = findTrack("spark");
    const calm = findTrack("calm");
    expect(spark && canReceive(spark, [])).toBe(true);
    expect(calm && canReceive(calm, [])).toBe(false);
    expect(calm && canReceive(calm, ["community"])).toBe(true);
  });

  it("maps Telegram languages and site pages", () => {
    expect(langFromTelegram("he")).toBe("he");
    expect(langFromTelegram("iw")).toBe("he");
    expect(langFromTelegram("ru-RU")).toBe("ru");
    expect(langFromTelegram("de")).toBe("en");
    expect(langFromTelegram(undefined)).toBe("en");
    expect(sitePage("https://youmademyday.store", "he", "terms")).toBe("https://youmademyday.store/he/#terms");
    expect(sitePage("https://youmademyday.store", "en", "privacy")).toBe("https://youmademyday.store/#privacy");
  });
});

describe("media proxy types", async () => {
  const { mediaType, attachment } = await import("../src/admin/media-type.ts");
  it("types files by message kind and extension", () => {
    expect(mediaType({ mediaKind: "photo", fileName: null })).toBe("image/jpeg");
    expect(mediaType({ mediaKind: "document", fileName: "Receipt.PDF" })).toBe("application/pdf");
    expect(mediaType({ mediaKind: "document", fileName: "x.unknown" })).toBe("application/octet-stream");
    expect(attachment("קבלה.pdf")).toContain("filename*=UTF-8''");
  });
});
