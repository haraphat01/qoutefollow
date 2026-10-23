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

type BusinessDetails = {
  businessName: string;
  replyEmail?: string | null;
  businessPhone?: string | null;
  emailSignature?: string | null;
  mailingAddress?: string | null;
  unsubscribeUrl: string;
  /** Where the Reply button sends the customer (the tracked reply address). */
  replyTo?: string | null;
};

function businessHeader(businessName: string) {
  const initial = businessName.trim().charAt(0).toUpperCase() || "•";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="vertical-align:middle;"><div style="width:36px;height:36px;border-radius:9px;background:${EMAIL_COLORS.brand};color:#ffffff;font-size:17px;font-weight:700;line-height:36px;text-align:center;">${escapeHtml(initial)}</div></td>
  <td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;color:${EMAIL_COLORS.brand};">${escapeHtml(businessName)}</td>
</tr></table>`;
}

function contactActions(input: BusinessDetails & { subject: string; buttonLabel: string }) {
  const replyAddress = input.replyTo?.trim() || input.replyEmail?.trim();
  return [
    replyAddress
      ? button(
          input.buttonLabel,
          `mailto:${replyAddress}?subject=${encodeURIComponent(`Re: ${input.subject}`)}`,
        )
      : "",
    input.businessPhone?.trim()
      ? paragraph(
          `Prefer to talk? Call <a href="tel:${escapeHtml(input.businessPhone.replace(/[^\d+]/g, ""))}" style="color:${EMAIL_COLORS.button};font-weight:600;">${escapeHtml(input.businessPhone.trim())}</a>`,
        )
      : "",
  ].join("");
}

function signatureBlock(input: BusinessDetails) {
  const inner = input.emailSignature?.trim()
    ? textToHtml(input.emailSignature, EMAIL_COLORS.muted)
    : paragraph(`<strong>${escapeHtml(input.businessName)}</strong>${input.replyEmail?.trim() ? `<br><span style="color:${EMAIL_COLORS.muted};">${escapeHtml(input.replyEmail.trim())}</span>` : ""}`);
  return `<div style="margin-top:8px;padding-top:16px;border-top:1px solid ${EMAIL_COLORS.border};">${inner}</div>`;
}

function complianceFooter(input: BusinessDetails, reason: string) {
  return [
    footerText(escapeHtml(reason)),
    input.mailingAddress?.trim()
      ? footerText(escapeHtml(input.mailingAddress.trim()).replace(/\n/g, "<br>"))
      : "",
    footerText(
      `<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${EMAIL_COLORS.faint};text-decoration:underline;">Unsubscribe</a> from follow-ups from ${escapeHtml(input.businessName)}`,
    ),
  ].join("");
}

/**
 * The customer-facing follow-up. It carries the contractor's brand, not
 * QuoteFollow's, and stays close to a personal email so it reads as one.
 */
export function buildFollowUpEmailHtml(
  input: BusinessDetails & {
    subject: string;
    body: string;
    estimate: {
      quoteNumber: string;
      jobDescription: string;
      amount: string;
      expiresAt: string;
    };
  },
) {
  const estimate = panel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows([
      ["Job", input.estimate.jobDescription],
      ["Estimate", input.estimate.quoteNumber],
      ["Amount", input.estimate.amount],
      ["Valid until", input.estimate.expiresAt],
    ])}</table>`,
    "Your estimate",
  );

  return emailDocument({
    title: input.subject,
    preheader: `${input.estimate.jobDescription} · ${input.estimate.amount}`,
    header: businessHeader(input.businessName),
    body:
      textToHtml(input.body) +
      estimate +
      contactActions({ ...input, buttonLabel: "Reply about this estimate" }) +
      signatureBlock(input),
    footer: complianceFooter(
      input,
      `You're receiving this because ${input.businessName} sent you a service estimate and requested permission to follow up.`,
    ),
  });
}

/** The estimate itself, sent when the contractor clicks "Send quote". */
export function buildQuoteEmail(
  input: BusinessDetails & {
    customerName: string;
    quoteNumber: string;
    jobDescription: string;
    items: { description: string; quantity: string; unitPrice: string; amount: string }[];
    total: string;
    quoteDate: string;
    expiresAt: string;
  },
) {
  const subject = `Your estimate ${input.quoteNumber} from ${input.businessName}`;
  const firstName = input.customerName.trim().split(/\s+/)[0] || "there";
  const intro = `Thanks for the opportunity to quote on your ${input.jobDescription.trim()}. Here's your estimate${input.expiresAt ? `, valid until ${input.expiresAt}` : ""}. Reply to this email with any questions or when you're ready to go ahead.`;

  const cell = `padding:10px 0;font-size:14px;line-height:20px;border-bottom:1px solid ${EMAIL_COLORS.border};`;
  const itemsTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
  <tr>
    <td style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.faint};border-bottom:1px solid ${EMAIL_COLORS.border};">Item</td>
    <td style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.faint};border-bottom:1px solid ${EMAIL_COLORS.border};text-align:right;">Amount</td>
  </tr>
${input.items
  .map(
    (item) => `  <tr>
    <td style="${cell}color:${EMAIL_COLORS.text};padding-right:12px;">${escapeHtml(item.description)}<br><span style="font-size:13px;color:${EMAIL_COLORS.muted};">${escapeHtml(item.quantity)} × ${escapeHtml(item.unitPrice)}</span></td>
    <td style="${cell}color:${EMAIL_COLORS.text};text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(item.amount)}</td>
  </tr>`,
  )
  .join("\n")}
  <tr>
    <td style="padding:14px 0 0;font-size:15px;font-weight:700;color:${EMAIL_COLORS.text};">Total</td>
    <td style="padding:14px 0 0;font-size:20px;font-weight:700;color:${EMAIL_COLORS.text};text-align:right;white-space:nowrap;">${escapeHtml(input.total)}</td>
  </tr>
</table>`;

  const meta = panel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows([
      ["Estimate", input.quoteNumber],
      ["Date", input.quoteDate],
      ["Valid until", input.expiresAt],
    ])}</table>`,
  );

  const html = emailDocument({
    title: subject,
    preheader: `${input.jobDescription.trim()} · ${input.total}`,
    header: businessHeader(input.businessName),
    body:
      paragraph(`Hi ${escapeHtml(firstName)},`) +
      paragraph(escapeHtml(intro)) +
      meta +
      itemsTable +
      contactActions({ ...input, subject, buttonLabel: "Reply or accept this estimate" }) +
      signatureBlock(input),
    footer: complianceFooter(
      input,
      `You're receiving this because you asked ${input.businessName} for a service estimate.`,
    ),
  });

  const text = [
    `Hi ${firstName},`,
    "",
    intro,
    "",
    `Estimate ${input.quoteNumber} · ${input.quoteDate}${input.expiresAt ? ` · valid until ${input.expiresAt}` : ""}`,
    "",
    ...input.items.map((item) => `- ${item.description}: ${item.quantity} × ${item.unitPrice} = ${item.amount}`),
    "",
    `Total: ${input.total}`,
    "",
    input.emailSignature?.trim() || input.businessName,
    ...(input.businessPhone?.trim() ? [`Call us: ${input.businessPhone.trim()}`] : []),
    ...(input.mailingAddress?.trim() ? ["", input.mailingAddress.trim()] : []),
    "",
    `To stop emails from ${input.businessName} about this estimate, unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject, text, html };
}
