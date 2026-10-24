import { appUrl } from "@/lib/billing/stripe";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  EMAIL_COLORS,
  button,
  emailDocument,
  escapeHtml,
  fallbackLink,
  footerText,
  heading,
  numberedList,
  panel,
  paragraph,
  smallPrint,
  textToHtml,
} from "@/lib/email/layout";

export type AccountEmail = { subject: string; text: string; html: string };

const SIGN_OFF = ["", "— QuoteFollow"];

function brandHeader() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="vertical-align:middle;"><img src="${escapeHtml(appUrl("/icon-192.png"))}" width="36" height="36" alt="" style="display:block;border:0;border-radius:9px;"></td>
  <td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;color:${EMAIL_COLORS.brand};letter-spacing:-0.01em;">QuoteFollow</td>
</tr></table>`;
}

function brandEmail(input: {
  subject: string;
  preheader: string;
  body: string;
  /** Why the recipient got this email, shown in the footer. */
  reason: string;
}) {
  return emailDocument({
    title: input.subject,
    preheader: input.preheader,
    header: brandHeader(),
    body: input.body,
    footer:
      footerText(escapeHtml(input.reason)) +
      footerText(
        `<a href="${escapeHtml(appUrl("/"))}" style="color:${EMAIL_COLORS.faint};">QuoteFollow</a> · Quote follow-up software for contractors`,
      ),
  });
}

export function buildVerificationEmail(input: {
  name: string;
  url: string;
}): AccountEmail {
  const subject = "Confirm your email for QuoteFollow";
  return {
    subject,
    text: [
      `Hi ${input.name},`,
      "",
      "Confirm your email address to finish setting up your QuoteFollow workspace:",
      input.url,
      "",
      "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: "One click to finish setting up your workspace.",
      reason: "You're receiving this because someone signed up for QuoteFollow with this email address.",
      body:
        heading("Confirm your email") +
        paragraph(`Hi ${escapeHtml(input.name)}, confirm your email address to finish setting up your QuoteFollow workspace.`) +
        button("Confirm email address", input.url) +
        smallPrint("This link expires in 24 hours. If you didn't create an account, you can ignore this email.") +
        fallbackLink(input.url),
    }),
  };
}

export function buildPasswordResetEmail(input: {
  name: string;
  url: string;
}): AccountEmail {
  const subject = "Reset your QuoteFollow password";
  return {
    subject,
    text: [
      `Hi ${input.name},`,
      "",
      "We received a request to reset your password. Choose a new one here:",
      input.url,
      "",
      "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email — your password won't change.",
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: "Choose a new password. The link works for 1 hour.",
      reason: "You're receiving this because a password reset was requested for your QuoteFollow account.",
      body:
        heading("Reset your password") +
        paragraph(`Hi ${escapeHtml(input.name)}, we received a request to reset your password. Choose a new one below.`) +
        button("Choose a new password", input.url) +
        smallPrint("This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email — your password won't change.") +
        fallbackLink(input.url),
    }),
  };
}

export function buildWelcomeEmail(input: {
  name: string;
  businessName: string;
}): AccountEmail {
  const subject = `Welcome to QuoteFollow, ${input.name}`;
  const steps = [
    { label: "Add your logo, mailing address and reply-to email", url: appUrl("/settings") },
    { label: "Review your follow-up sequence", url: appUrl("/settings/sequences") },
    { label: "Add your first quote or import a PDF estimate", url: appUrl("/quotes/new") },
  ];
  return {
    subject,
    text: [
      `Hi ${input.name},`,
      "",
      `${input.businessName} is ready to go. A few things to do first:`,
      "",
      ...steps.map((step, index) => `${index + 1}. ${step.label}: ${step.url}`),
      "",
      "Follow-ups stop on their own when a quote is accepted, declined, or the customer replies.",
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: `${input.businessName} is ready. Three quick steps to your first follow-up.`,
      reason: "You're receiving this because you created a QuoteFollow workspace.",
      body:
        heading(`Welcome, ${input.name}`) +
        paragraph(`<strong>${escapeHtml(input.businessName)}</strong> is ready to go. A few things to do first:`) +
        numberedList(
          steps.map(
            (step) =>
              `<a href="${escapeHtml(step.url)}" style="color:${EMAIL_COLORS.text};text-decoration:none;font-weight:600;">${escapeHtml(step.label)} &rarr;</a>`,
          ),
        ) +
        button("Open your workspace", appUrl("/dashboard")) +
        smallPrint("Follow-ups stop on their own when a quote is accepted, declined, or the customer replies."),
    }),
  };
}

export function buildTeamInviteEmail(input: {
  name: string;
  inviterName: string;
  businessName: string;
  url: string;
}): AccountEmail {
  const subject = `${input.inviterName} invited you to ${input.businessName} on QuoteFollow`;
  return {
    subject,
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
    html: brandEmail({
      subject,
      preheader: `Join ${input.businessName} on QuoteFollow.`,
      reason: `You're receiving this because ${input.inviterName} added you to their team on QuoteFollow.`,
      body:
        heading(`Join ${input.businessName}`) +
        paragraph(`Hi ${escapeHtml(input.name)}, <strong>${escapeHtml(input.inviterName)}</strong> added you to the <strong>${escapeHtml(input.businessName)}</strong> workspace on QuoteFollow, where the team tracks quotes and customer follow-ups.`) +
        button("Set your password and join", input.url) +
        smallPrint("This invite link expires in 7 days.") +
        fallbackLink(input.url),
    }),
  };
}

export function buildCustomerReplyAlertEmail(input: {
  quoteNumber: string;
  customerEmail: string;
  summary: string | null;
  excerpt: string;
  url: string;
}): AccountEmail {
  const subject = `Customer replied on ${input.quoteNumber}`;
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
    subject,
    text: lines.join("\n"),
    html: brandEmail({
      subject,
      preheader: input.summary ?? input.excerpt.slice(0, 120),
      reason: "You're receiving this because you're on the team in this QuoteFollow workspace.",
      body:
        heading(`${input.quoteNumber}: the customer replied`) +
        paragraph(`<strong>${escapeHtml(input.customerEmail)}</strong> replied. Automated follow-ups for this quote are paused until you update it.`) +
        (input.summary ? panel(paragraph(escapeHtml(input.summary)), "AI summary") : "") +
        panel(textToHtml(input.excerpt), "Their message") +
        button("Open the quote", input.url) +
        smallPrint("Reply to this email to answer the customer directly."),
    }),
  };
}

export function buildMentionEmail(input: {
  authorName: string;
  quoteNumber: string;
  note: string;
  url: string;
}): AccountEmail {
  const subject = `${input.authorName} mentioned you on ${input.quoteNumber}`;
  return {
    subject,
    text: [
      `${input.authorName} mentioned you in a team note on ${input.quoteNumber}:`,
      "",
      input.note,
      "",
      `Open the quote: ${input.url}`,
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: input.note.slice(0, 120),
      reason: "You're receiving this because a teammate @mentioned you in QuoteFollow.",
      body:
        heading(`${input.authorName} mentioned you`) +
        paragraph(`In a team note on <strong>${escapeHtml(input.quoteNumber)}</strong>:`) +
        panel(textToHtml(input.note)) +
        button("Open the quote", input.url),
    }),
  };
}

/** The full customer reply, forwarded to the business reply-to inbox. */
export function buildReplyForwardEmail(input: {
  quoteNumber: string;
  customerEmail: string;
  customerSubject?: string | null;
  summary: string | null;
  body: string;
  url: string;
}): AccountEmail {
  const subject = `Customer reply on ${input.quoteNumber}${input.customerSubject ? `: ${input.customerSubject}` : ""}`;
  const lines = [
    `${input.customerEmail} replied to your follow-up on ${input.quoteNumber}.`,
    "Automated follow-ups for this quote are paused.",
  ];
  if (input.summary) {
    lines.push("", `AI summary: ${input.summary}`);
  }
  lines.push(
    "",
    "— Customer message —",
    input.body.trim(),
    "",
    `Open the quote: ${input.url}`,
    "Reply to this email to answer the customer directly.",
  );
  return {
    subject,
    text: lines.join("\n"),
    html: brandEmail({
      subject,
      preheader: input.summary ?? input.body.trim().slice(0, 120),
      reason: "You're receiving this because this address is the reply-to email for your QuoteFollow workspace.",
      body:
        heading(`${input.quoteNumber}: new customer reply`) +
        paragraph(`<strong>${escapeHtml(input.customerEmail)}</strong> replied to your follow-up. Automated follow-ups for this quote are paused.`) +
        (input.summary ? panel(paragraph(escapeHtml(input.summary)), "AI summary") : "") +
        panel(textToHtml(input.body), "Customer message") +
        button("Open the quote", input.url) +
        smallPrint("Reply to this email to answer the customer directly."),
    }),
  };
}

export function buildQuoteAcceptedAlertEmail(input: {
  quoteNumber: string;
  customerName: string;
  signerName: string;
  optionName: string | null;
  total: string;
  url: string;
}): AccountEmail {
  const subject = `${input.customerName} accepted ${input.quoteNumber} (${input.total})`;
  const choice = input.optionName ? ` and chose ${input.optionName}` : "";
  return {
    subject,
    text: [
      `${input.customerName} accepted estimate ${input.quoteNumber} online${choice}.`,
      `Signed by: ${input.signerName}`,
      `Total: ${input.total}`,
      "",
      "Follow-ups for this quote have stopped.",
      `Open the quote: ${input.url}`,
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: `Signed by ${input.signerName} · ${input.total}`,
      reason: "You're receiving this because you're on the team in this QuoteFollow workspace.",
      body:
        heading(`${input.quoteNumber} was accepted`) +
        paragraph(`<strong>${escapeHtml(input.customerName)}</strong> accepted the estimate online${escapeHtml(choice)}. Follow-ups for this quote have stopped.`) +
        panel(
          paragraph(`Signed by <strong>${escapeHtml(input.signerName)}</strong><br>Total <strong>${escapeHtml(input.total)}</strong>`),
          "Acceptance",
        ) +
        button("Open the quote", input.url),
    }),
  };
}

export function buildQuoteAssignedEmail(input: {
  assignerName: string;
  quoteNumber: string;
  customerName: string;
  total: string;
  url: string;
}): AccountEmail {
  const subject = `${input.assignerName} assigned ${input.quoteNumber} to you`;
  return {
    subject,
    text: [
      `${input.assignerName} assigned estimate ${input.quoteNumber} for ${input.customerName} (${input.total}) to you.`,
      "",
      `Open the quote: ${input.url}`,
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: `${input.customerName} · ${input.total}`,
      reason: "You're receiving this because a teammate assigned you a quote in QuoteFollow.",
      body:
        heading(`${input.quoteNumber} is yours`) +
        paragraph(`<strong>${escapeHtml(input.assignerName)}</strong> assigned the estimate for <strong>${escapeHtml(input.customerName)}</strong> (${escapeHtml(input.total)}) to you.`) +
        button("Open the quote", input.url),
    }),
  };
}

export function buildWeeklySummaryEmail(input: {
  businessName: string;
  stats: [label: string, value: string][];
  pipeline: string;
  stale: { label: string; url: string }[];
  dashboardUrl: string;
  settingsUrl: string;
}): AccountEmail {
  const subject = `Your week at ${input.businessName}`;
  const statRows = input.stats
    .map(
      ([label, value]) => `<tr>
  <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.muted};">${escapeHtml(label)}</td>
  <td style="padding:6px 0;font-size:14px;font-weight:600;color:${EMAIL_COLORS.text};text-align:right;">${escapeHtml(value)}</td>
</tr>`,
    )
    .join("");
  const staleHtml = input.stale.length
    ? paragraph("<strong>Worth a call</strong> — open a week or more with no reply:") +
      `<ul style="margin:0 0 16px;padding-left:18px;">${input.stale
        .map((item) => `<li style="margin:0 0 6px;font-size:14px;"><a href="${escapeHtml(item.url)}" style="color:${EMAIL_COLORS.button};">${escapeHtml(item.label)}</a></li>`)
        .join("")}</ul>`
    : paragraph("No quotes have gone quiet for a week. Nice work.");

  return {
    subject,
    text: [
      `Your week at ${input.businessName}`,
      "",
      ...input.stats.map(([label, value]) => `${label}: ${value}`),
      "",
      `Pipeline: ${input.pipeline}`,
      "",
      ...(input.stale.length
        ? ["Worth a call (open a week+ with no reply):", ...input.stale.map((item) => `- ${item.label}: ${item.url}`)]
        : ["No quotes have gone quiet for a week."]),
      "",
      `Open QuoteFollow: ${input.dashboardUrl}`,
      `Turn off weekly summaries: ${input.settingsUrl}`,
      ...SIGN_OFF,
    ].join("\n"),
    html: brandEmail({
      subject,
      preheader: input.stats.map(([label, value]) => `${label}: ${value}`).slice(0, 3).join(" · "),
      reason: "You're receiving this weekly summary as a workspace owner. Turn it off under Settings → Sending.",
      body:
        heading("Your week in quotes") +
        panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${statRows}</table>`, "Last 7 days") +
        paragraph(`<strong>Pipeline:</strong> ${escapeHtml(input.pipeline)}`) +
        staleHtml +
        button("Open QuoteFollow", input.dashboardUrl),
    }),
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
    html: email.html,
    replyTo: options?.replyTo ?? null,
  });
}

export function excerpt(text: string, max = 600) {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}
