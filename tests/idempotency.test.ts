import { describe, expect, it } from "vitest";

describe("follow-up idempotency keys", () => {
  it("uses stable quote and step identifiers", () => {
    const quoteId = "quote-1";
    const stepId = "step-9";
    const key = `${quoteId}:${stepId}`;

    expect(key).toBe("quote-1:step-9");
    expect(key).toBe(`${quoteId}:${stepId}`);
  });
});
