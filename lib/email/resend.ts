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

export async function sendTransactionalEmail(input: {
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
    from: getEmailFromAddress(),
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
