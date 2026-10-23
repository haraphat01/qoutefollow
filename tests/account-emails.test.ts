import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  buildCustomerReplyAlertEmail,
  buildMentionEmail,
  buildPasswordResetEmail,
  buildTeamInviteEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
  excerpt,
} from "@/lib/email/account-emails";
import { hashAuthToken } from "@/lib/auth/tokens";

describe("account emails", () => {
  it("puts the action link in verification, reset, and invite emails", () => {
    const url = "https://app.example.com/link?token=abc";
    for (const email of [
      buildVerificationEmail({ name: "Ana", url }),
      buildPasswordResetEmail({ name: "Ana", url }),
      buildTeamInviteEmail({ name: "Ana", inviterName: "Mike", businessName: "Summit Roofing", url }),
    ]) {
      expect(email.text).toContain(url);
      expect(email.text).toContain("Hi Ana");
    }
  });

  it("names the inviter and business in the invite subject", () => {
    const email = buildTeamInviteEmail({ name: "Ana", inviterName: "Mike", businessName: "Summit Roofing", url: "u" });
    expect(email.subject).toBe("Mike invited you to Summit Roofing on QuoteFollow");
  });

  it("includes the business and setup links in the welcome email", () => {
    const email = buildWelcomeEmail({ name: "Ana", businessName: "Summit Roofing" });
    expect(email.text).toContain("Summit Roofing is ready");
    expect(email.text).toContain("/settings/email");
  });

  it("summarises customer replies and mentions with a quote link", () => {
    const reply = buildCustomerReplyAlertEmail({
      quoteNumber: "QF-0007",
      customerEmail: "pat@example.com",
      summary: "Wants to start Tuesday",
      excerpt: "Can you start Tuesday?",
      url: "https://app.example.com/quotes/1",
    });
    expect(reply.subject).toBe("Customer replied on QF-0007");
    expect(reply.text).toContain("AI summary: Wants to start Tuesday");
    expect(reply.text).toContain("https://app.example.com/quotes/1");

    const mention = buildMentionEmail({ authorName: "Mike", quoteNumber: "QF-0007", note: "@Ana call them", url: "u" });
    expect(mention.subject).toBe("Mike mentioned you on QF-0007");
  });

  it("sends a designed HTML version with the button link and escaped content", () => {
    const url = "https://app.example.com/link?token=abc&x=1";
    const email = buildVerificationEmail({ name: "<Ana>", url });
    expect(email.html).toContain("<!doctype html>");
    expect(email.html).toContain('href="https://app.example.com/link?token=abc&amp;x=1"');
    expect(email.html).toContain("&lt;Ana&gt;");
    expect(email.html).not.toContain("<Ana>");

    const reply = buildCustomerReplyAlertEmail({
      quoteNumber: "QF-1",
      customerEmail: "pat@example.com",
      summary: null,
      excerpt: "<script>alert(1)</script>",
      url: "u",
    });
    expect(reply.html).not.toContain("<script>");
  });

  it("truncates long excerpts", () => {
    expect(excerpt("a".repeat(700), 600)).toHaveLength(601);
  });

  it("stores tokens only as a stable sha-256 hash", () => {
    expect(hashAuthToken("abc")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAuthToken("abc")).toBe(hashAuthToken("abc"));
    expect(hashAuthToken("abc")).not.toBe("abc");
  });
});
