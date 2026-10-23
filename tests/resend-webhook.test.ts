import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { verifyResendWebhook } from "@/lib/webhooks/resend";

const SECRET = "whsec_dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0";

function signed(payload: string) {
  const id = "msg_test";
  const timestamp = new Date();
  return {
    id,
    timestamp: String(Math.floor(timestamp.getTime() / 1000)),
    signature: new Webhook(SECRET).sign(id, timestamp, payload),
  };
}

describe("verifyResendWebhook", () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it("returns the parsed event for a valid signature", () => {
    const payload = JSON.stringify({ type: "email.bounced", data: { email_id: "abc" } });
    const event = verifyResendWebhook(payload, signed(payload));
    expect(event.type).toBe("email.bounced");
    expect(event.data.email_id).toBe("abc");
  });

  it("rejects a tampered payload", () => {
    const payload = JSON.stringify({ type: "email.bounced", data: {} });
    expect(() =>
      verifyResendWebhook(payload.replace("bounced", "delivered"), signed(payload)),
    ).toThrow();
  });
});
