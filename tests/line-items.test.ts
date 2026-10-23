import { describe, expect, it } from "vitest";

import { lineTotal, parseLineItemsField, quoteTotal } from "@/lib/quotes/line-items";

describe("quote line items", () => {
  it("totals items to the cent without float drift", () => {
    const items = [
      { quantity: 3, unitPrice: 0.1 },
      { quantity: 1, unitPrice: 0.2 },
      { quantity: 2.5, unitPrice: 19.99 },
    ];
    expect(lineTotal(items[2])).toBe(49.98);
    expect(quoteTotal(items)).toBe(50.48);
  });

  it("parses the submitted JSON and recalculates the total", () => {
    const result = parseLineItemsField(
      JSON.stringify([
        { description: " Shingles ", quantity: "24", unitPrice: "125.50" },
        { description: "Dumpster", quantity: 1, unitPrice: 450 },
      ]),
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.items[0].description).toBe("Shingles");
      expect(result.total).toBe(3462);
    }
  });

  it("rejects empty, malformed, blank and zero-total items", () => {
    expect(parseLineItemsField(null)).toEqual({ error: "Add at least one item." });
    expect(parseLineItemsField("[]")).toEqual({ error: "Add at least one item." });
    expect(parseLineItemsField('[{"description":"","quantity":1,"unitPrice":5}]')).toEqual({ error: "Describe each item" });
    expect(parseLineItemsField('[{"description":"Free","quantity":1,"unitPrice":0}]')).toEqual({ error: "The quote total must be more than zero." });
    expect(parseLineItemsField('[{"description":"X","quantity":-1,"unitPrice":5}]')).toEqual({ error: "Quantity must be more than zero" });
  });
});
