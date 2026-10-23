import { describe, expect, it } from "vitest";

import { extractQuoteFieldsHeuristically } from "@/lib/pdf/heuristic-fields";

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
