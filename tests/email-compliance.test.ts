import { describe, expect, it } from "vitest";

import { buildFollowUpEmailHtml, buildFollowUpEmailText } from "@/lib/email/templates";
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

  it("keeps the compliance footer and reply button in the HTML follow-up", () => {
    const html = buildFollowUpEmailHtml({
      subject: "Following up on QF-7",
      body: "Hi Pat,\n\nAny questions?",
      businessName: "Acme & Sons",
      mailingAddress: "123 Main St, Austin TX 78701",
      unsubscribeUrl: "https://example.com/unsubscribe?t=1",
      replyTo: "reply+abc@reply.example.com",
      businessPhone: "(512) 555-0100",
      estimate: { quoteNumber: "QF-7", jobDescription: "Roof", amount: "$9,800", expiresAt: "" },
    });
    expect(html).toContain("123 Main St");
    expect(html).toContain("https://example.com/unsubscribe?t=1");
    expect(html).toContain("mailto:reply+abc@reply.example.com");
    expect(html).toContain('href="tel:5125550100"');
    expect(html).toContain("Acme &amp; Sons");
    expect(html).not.toContain("Valid until");
  });
});
