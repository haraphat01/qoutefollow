import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export function getEmailFromAddress() {
  return process.env.EMAIL_FROM ?? "QuoteFollow <onboarding@resend.dev>";
}

/**
 * EMAIL_FROM with its display name swapped, e.g. "Summit Roofing
 * <quotes@yourdomain.com>", so customers see the business they asked for a
 * quote rather than "QuoteFollow". The address (and its verified domain)
 * stays the same.
 */
export function fromAddressWithName(displayName: string | null | undefined) {
  const from = getEmailFromAddress();
  const name = displayName?.replace(/[\r\n]+/g, " ").replace(/["<>\\]/g, "").replace(/\s+/g, " ").trim();
  if (!name) {
    return from;
  }
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  return `"${name}" <${address}>`;
}

export async function sendTransactionalEmail(input: {
  /** Display name to send as; defaults to EMAIL_FROM's own name. */
  fromName?: string | null;
  to: string;
  subject: string;
  text: string;
  /** Designed version; `text` is still sent for clients that prefer it. */
  html?: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const resend = getResend();
  const result = await resend.emails.send({
    from: fromAddressWithName(input.fromName),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo ?? undefined,
    headers: input.headers,
    attachments: input.attachments,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data?.id ?? null;
}

/** Inbound webhooks only carry metadata; fetch the body and headers separately. */
export async function getReceivedEmail(emailId: string) {
  const resend = getResend();
  const result = await resend.emails.receiving.get(emailId);
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
