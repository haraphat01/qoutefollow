import { describe, expect, it } from "vitest";

import {
  applyExpirationUrgency,
  daysUntilExpiration,
  isExpirationUrgent,
  isPastExpiration,
} from "@/lib/follow-ups/expiration";

describe("expiration helpers", () => {
  it("detects past expiration", () => {
    const past = new Date("2020-01-01");
    expect(isPastExpiration(past, new Date("2026-01-01"))).toBe(true);
  });

  it("flags urgency within three days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    expect(isExpirationUrgent(soon)).toBe(true);
    expect(daysUntilExpiration(soon)).toBe(2);
  });

  it("adds urgency copy when near expiration", () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    const result = applyExpirationUrgency({
      subject: "Hello",
      body: "Body",
      expiresAt,
      formatDate: () => "Jan 1",
    });
    expect(result.subject).toContain("[Expires");
    expect(result.body).toContain("expires on");
  });
});
