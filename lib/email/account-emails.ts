import { appUrl } from "@/lib/billing/stripe";
import { sendTransactionalEmail } from "@/lib/email/resend";

export type AccountEmail = { subject: string; text: string };

const SIGN_OFF = ["", "— QuoteFollow"];

export function buildVerificationEmail(input: {
  name: string;
  url: string;
}): AccountEmail {
  return {
    subject: "Confirm your email for QuoteFollow",
    text: [
      `Hi ${input.name},`,
      "",
      "Confirm your email address to finish setting up your QuoteFollow workspace:",
      input.url,
      "",
      "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
      ...SIGN_OFF,
    ].join("\n"),
  };
}

export function buildPasswordResetEmail(input: {
  name: string;
  url: string;
}): AccountEmail {
  return {
    subject: "Reset your QuoteFollow password",
    text: [
      `Hi ${input.name},`,
      "",
      "We received a request to reset your password. Choose a new one here:",
      input.url,
      "",
      "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email — your password won't change.",
      ...SIGN_OFF,
    ].join("\n"),
  };
}

export function buildWelcomeEmail(input: {
  name: string;
  businessName: string;
}): AccountEmail {
  return {
    subject: `Welcome to QuoteFollow, ${input.name}`,
    text: [
      `Hi ${input.name},`,
      "",
      `${input.businessName} is ready to go. A few things to do first:`,
      "",
      `1. Add your mailing address and reply-to email: ${appUrl("/settings/email")}`,
      `2. Review your follow-up sequence: ${appUrl("/settings/sequences")}`,
      `3. Add your first quote or import a PDF estimate: ${appUrl("/quotes/new")}`,
      "",
      "Follow-ups stop on their own when a quote is accepted, declined, or the customer replies.",
      ...SIGN_OFF,
    ].join("\n"),
  };
}

export function buildTeamInviteEmail(input: {
  name: string;
  inviterName: string;
  businessName: string;
  url: string;
}): AccountEmail {
  return {
    subject: `${input.inviterName} invited you to ${input.businessName} on QuoteFollow`,
    text: [
      `Hi ${input.name},`,
      "",
      `${input.inviterName} added you to the ${input.businessName} workspace on QuoteFollow, where the team tracks quotes and customer follow-ups.`,
      "",
      "Set your password to get started:",
      input.url,
      "",
      "This invite link expires in 7 days.",
      ...SIGN_OFF,
    ].join("\n"),
  };
}

export function buildCustomerReplyAlertEmail(input: {
  quoteNumber: string;
  customerEmail: string;
  summary: string | null;
  excerpt: string;
  url: string;
}): AccountEmail {
  const lines = [
    `${input.customerEmail} replied about ${input.quoteNumber}. Automated follow-ups for this quote are paused until you update it.`,
  ];
  if (input.summary) {
    lines.push("", `AI summary: ${input.summary}`);
  }
  lines.push(
    "",
    "— Their message —",
    input.excerpt,
    "",
    `Open the quote: ${input.url}`,
    ...SIGN_OFF,
  );
  return {
    subject: `Customer replied on ${input.quoteNumber}`,
    text: lines.join("\n"),
  };
}

export function buildMentionEmail(input: {
  authorName: string;
  quoteNumber: string;
  note: string;
  url: string;
}): AccountEmail {
  return {
    subject: `${input.authorName} mentioned you on ${input.quoteNumber}`,
    text: [
      `${input.authorName} mentioned you in a team note on ${input.quoteNumber}:`,
      "",
      input.note,
      "",
      `Open the quote: ${input.url}`,
      ...SIGN_OFF,
    ].join("\n"),
  };
}

/** Account and team emails need Resend; without it these flows are skipped. */
export function accountEmailsEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendAccountEmail(
  to: string,
  email: AccountEmail,
  options?: { replyTo?: string | null },
) {
  return sendTransactionalEmail({
    to,
    subject: email.subject,
    text: email.text,
    replyTo: options?.replyTo ?? null,
  });
}

export function excerpt(text: string, max = 600) {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}
