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
  replyTo?: string | null;
  headers?: Record<string, string>;
}) {
  const resend = getResend();
  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    replyTo: input.replyTo ?? undefined,
    headers: input.headers,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data?.id ?? null;
}
