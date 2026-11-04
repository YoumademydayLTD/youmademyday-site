import { describe, expect, it } from "vitest";
import { orderRow, subscriptionRow, checkoutRow } from "../src/webhook/rows.ts";
import { MAP } from "./fixtures.ts";

describe("webhook rows", () => {
  it("reads a paid cart order with its item ids and language", () => {
    const row = orderRow({ id: "o1", status: "paid", product_id: "p-store", checkout_id: "ch1", customer_id: "cu1", customer: { email: "a@b.c" },
      total_amount: 8400, currency: "ils", metadata: { ymd_ids: "b9,b10,b11", ymd_lang: "he" } }, MAP);
    expect(row).toMatchObject({ id: "o1", itemIds: ["b9", "b10", "b11"], lang: "he", customerEmail: "a@b.c", totalAmount: 8400, needsReview: false });
  });
  it("flags a store order bought without item ids", () => {
    expect(orderRow({ id: "o2", status: "paid", product_id: "p-store", metadata: {} }, MAP).needsReview).toBe(true);
  });
  it("knows the item of a product bought straight from Polar", () => {
    expect(orderRow({ id: "o3", status: "paid", product_id: "p-b9" }, MAP).itemIds).toEqual(["b9"]);
  });
  it("leaves the owner's own products unmapped", () => {
    expect(orderRow({ id: "o4", status: "paid", product_id: "owner-test" }, MAP)).toMatchObject({ itemIds: [], needsReview: false });
  });
  it("reads a subscription's plan and cancel state", () => {
    expect(subscriptionRow({ id: "s1", status: "active", product_id: "p-grow", cancel_at_period_end: true, current_period_end: "2026-11-11T00:00:00Z" }, MAP))
      .toMatchObject({ planId: "grow", cancelAtPeriodEnd: true, currentPeriodEnd: "2026-11-11T00:00:00Z" });
  });
  it("reads a checkout status", () => {
    expect(checkoutRow({ id: "ch1", status: "succeeded", product_id: "p-b51", total_amount: 200, currency: "usd", metadata: { ymd_kind: "product", ymd_ids: "b51" } }, MAP))
      .toMatchObject({ id: "ch1", status: "succeeded", kind: "product", itemIds: ["b51"] });
  });
});
