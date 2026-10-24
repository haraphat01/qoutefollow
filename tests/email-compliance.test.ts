import { describe, expect, it } from "vitest";

import { buildFollowUpEmailHtml, buildFollowUpEmailText, buildQuoteEmail } from "@/lib/email/templates";
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

  it("itemizes the quote email and keeps the compliance footer", () => {
    const email = buildQuoteEmail({
      businessName: "Summit <Roofing>",
      unsubscribeUrl: "https://example.com/u",
      replyTo: "reply+q1@reply.example.com",
      mailingAddress: "120 Oak St",
      customerName: "Jordan Miller",
      quoteNumber: "QF-9",
      jobDescription: "roof replacement",
      options: [
        {
          name: null,
          items: [
            { description: "Shingles", quantity: "24", unitPrice: "$125.50", amount: "$3,012.00" },
            { description: "Dumpster", quantity: "1", unitPrice: "$450.00", amount: "$450.00" },
          ],
          subtotal: "$3,462.00",
          discount: null,
          tax: null,
          total: "$3,462.00",
        },
      ],
      discountLabel: "Discount",
      taxLabel: "Tax (0%)",
      viewUrl: "https://app.example.com/q/token123",
      quoteDate: "Oct 24, 2026",
      expiresAt: "Nov 30, 2026",
    });
    expect(email.subject).toBe("Your estimate QF-9 from Summit <Roofing>");
    expect(email.html).toContain("Summit &lt;Roofing&gt;");
    expect(email.html).toContain("Shingles");
    expect(email.html).toContain("$3,462.00");
    expect(email.html).toContain("mailto:reply+q1@reply.example.com");
    expect(email.html).toContain("120 Oak St");
    expect(email.text).toContain("- Dumpster: 1 × $450.00 = $450.00");
    expect(email.text).toContain("Hi Jordan,");
    expect(email.text).toContain("https://example.com/u");
    expect(email.html).toContain("View &amp; accept online");
    expect(email.html).toContain("https://app.example.com/q/token123");
  });
});
