import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/export/csv";
import { computeTotals, parsePricingField, quoteAmount } from "@/lib/quotes/pricing";

const items = [
  { quantity: 24, unitPrice: 125.5 },
  { quantity: 1, unitPrice: 450 },
];

describe("quote pricing", () => {
  it("applies a percentage discount, then tax, to the cent", () => {
    expect(computeTotals(items, { type: "percent", value: 10 }, 8.25)).toEqual({
      subtotal: 3462,
      discount: 346.2,
      tax: 257.05,
      total: 3372.85,
    });
  });

  it("caps an amount discount at the subtotal", () => {
    expect(computeTotals(items, { type: "amount", value: 5000 }, 5).total).toBe(0);
  });

  it("stores the first option's total until one is chosen", () => {
    const pricing = {
      options: [
        { name: "Good", items: [{ description: "A", quantity: 1, unitPrice: 100 }] },
        { name: "Better", items: [{ description: "B", quantity: 1, unitPrice: 200 }] },
      ],
      discount: null,
      taxRate: 10,
    };
    expect(quoteAmount(pricing)).toBe(110);
    expect(quoteAmount(pricing, 1)).toBe(220);
  });

  it("parses options and requires names when there are several", () => {
    const valid = parsePricingField(
      JSON.stringify({
        options: [
          { name: "Good", items: [{ description: "A", quantity: 1, unitPrice: 100 }] },
          { name: "Best", items: [{ description: "B", quantity: 2, unitPrice: 150 }] },
        ],
        discount: { type: "amount", value: 0 },
        taxRate: 0,
      }),
    );
    expect("error" in valid).toBe(false);
    if (!("error" in valid)) {
      expect(valid.pricing.discount).toBeNull();
      expect(valid.amount).toBe(100);
    }

    const unnamed = parsePricingField(
      JSON.stringify({
        options: [
          { name: "", items: [{ description: "A", quantity: 1, unitPrice: 100 }] },
          { name: "Best", items: [{ description: "B", quantity: 1, unitPrice: 150 }] },
        ],
        discount: null,
        taxRate: 0,
      }),
    );
    expect(unnamed).toEqual({ error: "Name option 1." });
  });

  it("rejects out-of-range tax and discounts", () => {
    const base = { options: [{ name: null, items: [{ description: "A", quantity: 1, unitPrice: 100 }] }] };
    expect(parsePricingField(JSON.stringify({ ...base, discount: null, taxRate: 45 }))).toEqual({ error: "Tax rate must be 30% or less" });
    expect(parsePricingField(JSON.stringify({ ...base, discount: { type: "percent", value: 120 }, taxRate: 0 }))).toEqual({
      error: "A percentage discount can't exceed 100%.",
    });
  });
});

describe("csv export", () => {
  it("quotes special characters and defuses formulas", () => {
    const csv = toCsv([["Name", "Note"], ['Ann "A", Jr', "=HYPERLINK(\"x\")"], ["-5", "line\nbreak"]]);
    expect(csv).toBe('﻿Name,Note\r\n"Ann ""A"", Jr","\'=HYPERLINK(""x"")"\r\n\'-5,"line\nbreak"');
  });
});
