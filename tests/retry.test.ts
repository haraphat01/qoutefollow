import { describe, expect, it } from "vitest";

import { isRetryableError, nextRetryDate } from "@/lib/follow-ups/retry";

describe("follow-up retry helpers", () => {
  it("detects retryable provider errors", () => {
    expect(isRetryableError("Upstream timeout while sending")).toBe(true);
    expect(isRetryableError("Invalid recipient address")).toBe(false);
  });

  it("backs off retry schedule", () => {
    const first = nextRetryDate(1);
    const later = nextRetryDate(4);
    expect(later.getTime()).toBeGreaterThan(first.getTime());
  });
});
