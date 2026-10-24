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
  logoUrl?: string | null;
  /** The customer's online quote page. */
  viewUrl?: string | null;
};

function businessHeader(businessName: string, logoUrl?: string | null) {
  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" height="48" style="display:block;height:48px;width:auto;max-width:220px;border:0;">`;
  }
  const initial = businessName.trim().charAt(0).toUpperCase() || "•";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="vertical-align:middle;"><div style="width:36px;height:36px;border-radius:9px;background:${EMAIL_COLORS.brand};color:#ffffff;font-size:17px;font-weight:700;line-height:36px;text-align:center;">${escapeHtml(initial)}</div></td>
  <td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;color:${EMAIL_COLORS.brand};">${escapeHtml(businessName)}</td>
</tr></table>`;
}

function contactActions(input: BusinessDetails & { subject: string; buttonLabel: string }) {
  const replyAddress = input.replyTo?.trim() || input.replyEmail?.trim();
  const replyHref = replyAddress
    ? `mailto:${replyAddress}?subject=${encodeURIComponent(`Re: ${input.subject}`)}`
    : null;
  return [
    input.viewUrl
      ? button(input.buttonLabel, input.viewUrl) +
        (replyHref
          ? paragraph(`Questions? <a href="${escapeHtml(replyHref)}" style="color:${EMAIL_COLORS.button};font-weight:600;">Reply to this email</a>.`)
          : "")
      : replyHref
        ? button(input.buttonLabel, replyHref)
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
    header: businessHeader(input.businessName, input.logoUrl),
    body:
      textToHtml(input.body) +
      estimate +
      contactActions({ ...input, buttonLabel: input.viewUrl ? "View your estimate" : "Reply about this estimate" }) +
      signatureBlock(input),
    footer: complianceFooter(
      input,
      `You're receiving this because ${input.businessName} sent you a service estimate and requested permission to follow up.`,
    ),
  });
}

export type QuoteEmailOption = {
  name: string | null;
  items: { description: string; quantity: string; unitPrice: string; amount: string }[];
  subtotal: string;
  discount: string | null;
  tax: string | null;
  total: string;
};

/** The estimate itself, sent when the contractor clicks "Send quote". */
export function buildQuoteEmail(
  input: BusinessDetails & {
    customerName: string;
    quoteNumber: string;
    jobDescription: string;
    options: QuoteEmailOption[];
    discountLabel: string;
    taxLabel: string;
    quoteDate: string;
    expiresAt: string;
  },
) {
  const subject = `Your estimate ${input.quoteNumber} from ${input.businessName}`;
  const firstName = input.customerName.trim().split(/\s+/)[0] || "there";
  const multiple = input.options.length > 1;
  const intro = `Thanks for the opportunity to quote on your ${input.jobDescription.trim()}. Here's your estimate${input.expiresAt ? `, valid until ${input.expiresAt}` : ""}.${multiple ? ` We've included ${input.options.length} options so you can choose what suits you best.` : ""} ${input.viewUrl ? "You can view, download and accept it online." : "Reply to this email with any questions or when you're ready to go ahead."}`;

  const label = `padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.faint};border-bottom:1px solid ${EMAIL_COLORS.border};`;
  const cell = `padding:10px 0;font-size:14px;line-height:20px;border-bottom:1px solid ${EMAIL_COLORS.border};`;
  const summaryRow = (name: string, value: string, strong = false) => `  <tr>
    <td style="padding:${strong ? "12px" : "6px"} 0 0;font-size:${strong ? "15px" : "14px"};font-weight:${strong ? 700 : 400};color:${strong ? EMAIL_COLORS.text : EMAIL_COLORS.muted};">${escapeHtml(name)}</td>
    <td style="padding:${strong ? "12px" : "6px"} 0 0;font-size:${strong ? "20px" : "14px"};font-weight:${strong ? 700 : 400};color:${EMAIL_COLORS.text};text-align:right;white-space:nowrap;">${escapeHtml(value)}</td>
  </tr>`;

  const optionTable = (option: QuoteEmailOption, index: number) => `${
    multiple
      ? `<p style="margin:${index === 0 ? "4px" : "24px"} 0 10px;font-size:16px;font-weight:700;color:${EMAIL_COLORS.text};">Option ${index + 1}: ${escapeHtml(option.name ?? "")}</p>`
      : ""
  }<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
  <tr><td style="${label}">Item</td><td style="${label}text-align:right;">Amount</td></tr>
${option.items
  .map(
    (item) => `  <tr>
    <td style="${cell}color:${EMAIL_COLORS.text};padding-right:12px;">${escapeHtml(item.description)}<br><span style="font-size:13px;color:${EMAIL_COLORS.muted};">${escapeHtml(item.quantity)} × ${escapeHtml(item.unitPrice)}</span></td>
    <td style="${cell}color:${EMAIL_COLORS.text};text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(item.amount)}</td>
  </tr>`,
  )
  .join("\n")}
${option.discount || option.tax ? summaryRow("Subtotal", option.subtotal) : ""}
${option.discount ? summaryRow(input.discountLabel, `-${option.discount}`) : ""}
${option.tax ? summaryRow(input.taxLabel, option.tax) : ""}
${summaryRow("Total", option.total, true)}
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
    preheader: `${input.jobDescription.trim()} · ${input.options.map((option) => option.total).join(" / ")}`,
    header: businessHeader(input.businessName, input.logoUrl),
    body:
      paragraph(`Hi ${escapeHtml(firstName)},`) +
      paragraph(escapeHtml(intro)) +
      meta +
      input.options.map(optionTable).join("") +
      contactActions({
        ...input,
        subject,
        buttonLabel: input.viewUrl ? "View & accept online" : "Reply or accept this estimate",
      }) +
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
    ...input.options.flatMap((option, index) => [
      "",
      ...(multiple ? [`Option ${index + 1}: ${option.name ?? ""}`] : []),
      ...option.items.map((item) => `- ${item.description}: ${item.quantity} × ${item.unitPrice} = ${item.amount}`),
      ...(option.discount || option.tax ? [`Subtotal: ${option.subtotal}`] : []),
      ...(option.discount ? [`${input.discountLabel}: -${option.discount}`] : []),
      ...(option.tax ? [`${input.taxLabel}: ${option.tax}`] : []),
      `Total: ${option.total}`,
    ]),
    "",
    ...(input.viewUrl ? [`View and accept online: ${input.viewUrl}`, ""] : []),
    input.emailSignature?.trim() || input.businessName,
    ...(input.businessPhone?.trim() ? [`Call us: ${input.businessPhone.trim()}`] : []),
    ...(input.mailingAddress?.trim() ? ["", input.mailingAddress.trim()] : []),
    "",
    `To stop emails from ${input.businessName} about this estimate, unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject, text, html };
}

/** Sent to the customer after they accept online, with the signed PDF attached. */
export function buildAcceptanceConfirmationEmail(
  input: BusinessDetails & {
    customerName: string;
    signerName: string;
    quoteNumber: string;
    jobDescription: string;
    optionName: string | null;
    total: string;
    acceptedAt: string;
  },
) {
  const subject = `You accepted estimate ${input.quoteNumber} from ${input.businessName}`;
  const firstName = input.customerName.trim().split(/\s+/)[0] || "there";
  const intro = `Thanks for choosing ${input.businessName}! This confirms you accepted the estimate for your ${input.jobDescription.trim()}. We'll be in touch shortly to schedule the work. A signed copy is attached.`;
  const html = emailDocument({
    title: subject,
    preheader: `Accepted · ${input.total}`,
    header: businessHeader(input.businessName, input.logoUrl),
    body:
      paragraph(`Hi ${escapeHtml(firstName)},`) +
      paragraph(escapeHtml(intro)) +
      panel(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows([
          ["Estimate", input.quoteNumber],
          ["Option", input.optionName],
          ["Total", input.total],
          ["Signed by", input.signerName],
          ["Accepted", input.acceptedAt],
        ])}</table>`,
        "Your acceptance",
      ) +
      contactActions({ ...input, subject, buttonLabel: "View your estimate" }) +
      signatureBlock(input),
    footer: complianceFooter(input, `You're receiving this because you accepted an estimate from ${input.businessName}.`),
  });
  const text = [
    `Hi ${firstName},`,
    "",
    intro,
    "",
    `Estimate: ${input.quoteNumber}`,
    ...(input.optionName ? [`Option: ${input.optionName}`] : []),
    `Total: ${input.total}`,
    `Signed by: ${input.signerName}`,
    `Accepted: ${input.acceptedAt}`,
    ...(input.viewUrl ? ["", `View your estimate: ${input.viewUrl}`] : []),
    "",
    input.emailSignature?.trim() || input.businessName,
  ].join("\n");
  return { subject, text, html };
}
