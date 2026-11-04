import { describe, expect, it } from "vitest";
import { allowedOrigins, corsHeaders, isOriginAllowed } from "../src/http/cors.ts";

const allowed = allowedOrigins({ siteUrl: "https://youmademyday.store", extraOrigins: "http://127.0.0.1:4322" });

describe("cors", () => {
  it("allows the store and the local preview only", () => {
    expect(isOriginAllowed("https://youmademyday.store", allowed)).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:4322", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
    expect(isOriginAllowed("https://youmademyday.store.evil.example", allowed)).toBe(false);
  });
  it("lets server-to-server calls without an Origin through", () => {
    expect(isOriginAllowed(null, allowed)).toBe(true);
  });
  it("echoes only allowed origins", () => {
    expect(corsHeaders("https://youmademyday.store", allowed)["Access-Control-Allow-Origin"]).toBe("https://youmademyday.store");
    expect(corsHeaders("https://evil.example", allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
