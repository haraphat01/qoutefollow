import { describe, expect, it } from "vitest";

import { extractQuoteFieldsHeuristically, extractLineItems } from "@/lib/pdf/heuristic-fields";

describe("extractQuoteFieldsHeuristically", () => {
  it("finds the common estimate fields in plain text", () => {
    const fields = extractQuoteFieldsHeuristically(
      [
        "Summit Roofing  office@summitroofing.com",
        "Estimate #: EST-1042",
        "Date: 03/14/2026",
        "Customer: Jordan Miller",
        "jordan.miller@example.com",
        "Tear-off and replace shingles   $11,200.00",
        "Total: $12,450.50",
        "Valid until: 04/14/2026",
      ].join("\n"),
    );

    expect(fields.customerEmail).toBe("jordan.miller@example.com");
    expect(fields.customerName).toBe("Jordan Miller");
    expect(fields.estimateNumber).toBe("EST-1042");
    expect(fields.amount).toBe(12450.5);
    expect(fields.quoteDate).toBe("2026-03-14");
    expect(fields.expirationDate).toBe("2026-04-14");
    expect(fields.confidence).toBe("medium");
  });

  it("returns nulls with low confidence when nothing matches", () => {
    const fields = extractQuoteFieldsHeuristically("hello world");
    expect(fields.customerEmail).toBeNull();
    expect(fields.amount).toBeNull();
    expect(fields.confidence).toBe("low");
  });
});

describe("line items from estimate text", () => {
  const text = [
    "Summit Roofing — Estimate #QF-88",
    "Description Qty Unit price Amount",
    "Architectural shingles, installed 24 $125.50 $3,012.00",
    "Dumpster rental 1 450.00 450.00",
    "Ridge vent 2.5 $19.99 $49.98",
    "Permit fee 1 $150.00 $175.00",
    "Subtotal 3 $3,511.98 $3,511.98",
    "Tax (8.25%) $289.74",
    "Total $3,801.72",
  ].join("\n");

  it("keeps rows whose quantity × price matches the amount", () => {
    expect(extractLineItems(text)).toEqual([
      { description: "Architectural shingles, installed", quantity: 24, unitPrice: 125.5 },
      { description: "Dumpster rental", quantity: 1, unitPrice: 450 },
      { description: "Ridge vent", quantity: 2.5, unitPrice: 19.99 },
    ]);
  });

  it("finds the stated tax rate", () => {
    const fields = extractQuoteFieldsHeuristically(text);
    expect(fields.taxRate).toBe(8.25);
    expect(fields.lineItems).toHaveLength(3);
  });

  it("returns no items for a total-only estimate", () => {
    expect(extractLineItems("Roof replacement\nTotal due $9,800.00")).toEqual([]);
  });
});
