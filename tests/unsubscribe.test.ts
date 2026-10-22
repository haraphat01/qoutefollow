import { describe, expect, it } from "vitest";

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/email/unsubscribe";

describe("unsubscribe tokens", () => {
  it("round-trips signed payload", () => {
    process.env.CRON_SECRET = "test-secret";

    const token = createUnsubscribeToken({
      organizationId: "11111111-1111-1111-1111-111111111111",
      email: "customer@example.com",
    });

    const payload = verifyUnsubscribeToken(token);
    expect(payload?.email).toBe("customer@example.com");
    expect(payload?.organizationId).toBe("11111111-1111-1111-1111-111111111111");
  });
});
