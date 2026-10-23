import {
  EMAIL_COLORS,
  button,
  detailRows,
  emailDocument,
  escapeHtml,
  footerText,
  panel,
  paragraph,
  textToHtml,
} from "./layout";
import type { TemplateVariables } from "./template-variables";

export function renderEmailTemplate(
  template: string,
  variables: TemplateVariables,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key as keyof TemplateVariables] ?? "";
  });
}

export function buildFollowUpEmailText(input: {
  body: string;
  businessName: string;
  replyEmail?: string | null;
  businessPhone?: string | null;
  emailSignature?: string | null;
  mailingAddress?: string | null;
  unsubscribeUrl: string;
}) {
  const sections: string[] = [input.body.trim()];

  if (input.emailSignature?.trim()) {
    sections.push("", input.emailSignature.trim());
  }

  sections.push("", `—`, input.businessName);

  if (input.replyEmail?.trim()) {
    sections.push(`Email us: ${input.replyEmail.trim()}`);
  }

  if (input.businessPhone?.trim()) {
    sections.push(`Call us: ${input.businessPhone.trim()}`);
  }

  sections.push(
    "",
    "—",
    `You are receiving this message because ${input.businessName} sent you a service estimate and requested permission to follow up.`,
  );

  if (input.mailingAddress?.trim()) {
    sections.push("", input.mailingAddress.trim());
  }

  sections.push(
    "",
    `To stop follow-up emails for this business, unsubscribe: ${input.unsubscribeUrl}`,
  );

  return sections.join("\n");
}

/**
 * The customer-facing follow-up. It carries the contractor's brand, not
 * QuoteFollow's, and stays close to a personal email so it reads as one.
 */
export function buildFollowUpEmailHtml(input: {
  subject: string;
  body: string;
  businessName: string;
  replyEmail?: string | null;
  businessPhone?: string | null;
  emailSignature?: string | null;
  mailingAddress?: string | null;
  unsubscribeUrl: string;
  /** Where the Reply button sends the customer (the tracked reply address). */
  replyTo?: string | null;
  estimate: {
    quoteNumber: string;
    jobDescription: string;
    amount: string;
    expiresAt: string;
  };
}) {
  const initial = input.businessName.trim().charAt(0).toUpperCase() || "•";
  const header = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="vertical-align:middle;"><div style="width:36px;height:36px;border-radius:9px;background:${EMAIL_COLORS.brand};color:#ffffff;font-size:17px;font-weight:700;line-height:36px;text-align:center;">${escapeHtml(initial)}</div></td>
  <td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;color:${EMAIL_COLORS.brand};">${escapeHtml(input.businessName)}</td>
</tr></table>`;

  const estimate = panel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows([
      ["Job", input.estimate.jobDescription],
      ["Estimate", input.estimate.quoteNumber],
      ["Amount", input.estimate.amount],
      ["Valid until", input.estimate.expiresAt],
    ])}</table>`,
    "Your estimate",
  );

  const replyAddress = input.replyTo?.trim() || input.replyEmail?.trim();
  const actions = [
    replyAddress
      ? button(
          "Reply about this estimate",
          `mailto:${replyAddress}?subject=${encodeURIComponent(`Re: ${input.subject}`)}`,
        )
      : "",
    input.businessPhone?.trim()
      ? paragraph(
          `Prefer to talk? Call <a href="tel:${escapeHtml(input.businessPhone.replace(/[^\d+]/g, ""))}" style="color:${EMAIL_COLORS.button};font-weight:600;">${escapeHtml(input.businessPhone.trim())}</a>`,
        )
      : "",
  ].join("");

  const signature = input.emailSignature?.trim()
    ? `<div style="margin-top:8px;padding-top:16px;border-top:1px solid ${EMAIL_COLORS.border};">${textToHtml(input.emailSignature, EMAIL_COLORS.muted)}</div>`
    : `<div style="margin-top:8px;padding-top:16px;border-top:1px solid ${EMAIL_COLORS.border};">${paragraph(`<strong>${escapeHtml(input.businessName)}</strong>${input.replyEmail?.trim() ? `<br><span style="color:${EMAIL_COLORS.muted};">${escapeHtml(input.replyEmail.trim())}</span>` : ""}`)}</div>`;

  const footer = [
    footerText(
      `You're receiving this because ${escapeHtml(input.businessName)} sent you a service estimate and requested permission to follow up.`,
    ),
    input.mailingAddress?.trim()
      ? footerText(escapeHtml(input.mailingAddress.trim()).replace(/\n/g, "<br>"))
      : "",
    footerText(
      `<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${EMAIL_COLORS.faint};text-decoration:underline;">Unsubscribe</a> from follow-ups from ${escapeHtml(input.businessName)}`,
    ),
  ].join("");

  return emailDocument({
    title: input.subject,
    preheader: `${input.estimate.jobDescription} · ${input.estimate.amount}`,
    header,
    body: textToHtml(input.body) + estimate + actions + signature,
    footer,
  });
}
