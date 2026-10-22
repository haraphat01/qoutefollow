import { describe, expect, it } from "vitest";

import { buildFollowUpEmailText } from "@/lib/email/templates";
import { parseEmailFromAddress } from "@/lib/email/sending-domain";

describe("email compliance helpers", () => {
  it("parses EMAIL_FROM display format", () => {
    const parsed = parseEmailFromAddress(
      "Acme Roofing <quotes@mail.acme.com>",
    );
    expect(parsed?.domain).toBe("mail.acme.com");
  });

  it("includes mailing address and unsubscribe in footer", () => {
    const text = buildFollowUpEmailText({
      body: "Hi there",
      businessName: "Acme Roofing",
      mailingAddress: "123 Main St, Austin TX 78701",
      unsubscribeUrl: "https://example.com/unsubscribe",
    });
    expect(text).toContain("123 Main St");
    expect(text).toContain("unsubscribe");
    expect(text).toContain("service estimate");
  });
});
