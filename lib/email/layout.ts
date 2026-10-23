/**
 * Table-based HTML with inline styles, which is what Gmail, Outlook and Apple
 * Mail reliably render. Every value passed in is escaped.
 */

export const EMAIL_COLORS = {
  page: "#f4f5f0",
  card: "#ffffff",
  border: "#e3e8df",
  text: "#1f3329",
  muted: "#66756c",
  faint: "#8a968e",
  brand: "#0c281c",
  accent: "#80cd82",
  button: "#285742",
  panel: "#f6f8f3",
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain text → paragraphs, keeping single line breaks and linking URLs. */
export function textToHtml(text: string, color: string = EMAIL_COLORS.text) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = escapeHtml(paragraph)
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          `<a href="$1" style="color:${EMAIL_COLORS.button};text-decoration:underline;">$1</a>`,
        )
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${color};">${html}</p>`;
    })
    .join("");
}

export function button(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td style="border-radius:10px;background:${EMAIL_COLORS.button};">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

/** A link for clients that block the button, e.g. "Or paste this link…". */
export function fallbackLink(url: string) {
  return `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">If the button doesn't work, paste this link into your browser:<br><a href="${escapeHtml(url)}" style="color:${EMAIL_COLORS.button};word-break:break-all;">${escapeHtml(url)}</a></p>`;
}

/** A shaded box, e.g. for a quoted customer message. */
export function panel(innerHtml: string, label?: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
  <tr><td style="background:${EMAIL_COLORS.panel};border:1px solid ${EMAIL_COLORS.border};border-radius:12px;padding:16px 18px;">
    ${label ? `<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.faint};">${escapeHtml(label)}</p>` : ""}
    ${innerHtml}
  </td></tr>
</table>`;
}

/** Label/value rows inside a panel. Empty values are skipped. */
export function detailRows(rows: [label: string, value: string | null | undefined][]) {
  return rows
    .filter(([, value]) => value && value.trim())
    .map(
      ([label, value]) => `<tr>
  <td style="padding:5px 12px 5px 0;font-size:14px;color:${EMAIL_COLORS.muted};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:5px 0;font-size:14px;font-weight:600;color:${EMAIL_COLORS.text};text-align:right;">${escapeHtml(value!)}</td>
</tr>`,
    )
    .join("");
}

export function numberedList(items: string[]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
${items
  .map(
    (item, index) => `  <tr>
    <td style="width:28px;padding:0 0 12px;vertical-align:top;"><div style="width:22px;height:22px;border-radius:11px;background:${EMAIL_COLORS.panel};border:1px solid ${EMAIL_COLORS.border};font-size:12px;font-weight:700;line-height:22px;text-align:center;color:${EMAIL_COLORS.button};">${index + 1}</div></td>
    <td style="padding:2px 0 12px 8px;font-size:15px;line-height:22px;color:${EMAIL_COLORS.text};">${item}</td>
  </tr>`,
  )
  .join("\n")}
</table>`;
}

/**
 * The outer document. `header` sits above the white card and `footer` below
 * it; `preheader` is the inbox preview line.
 */
export function emailDocument(input: {
  title: string;
  preheader: string;
  header: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_COLORS.page};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${FONT};">
      <tr><td style="padding:0 4px 20px;">${input.header}</td></tr>
      <tr><td style="background:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.border};border-radius:16px;padding:32px 32px 16px;font-family:${FONT};">
        ${input.body}
      </td></tr>
      <tr><td style="padding:20px 8px 0;font-family:${FONT};">${input.footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function footerText(html: string) {
  return `<p style="margin:0 0 10px;font-size:12px;line-height:18px;color:${EMAIL_COLORS.faint};text-align:center;">${html}</p>`;
}

export function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:${EMAIL_COLORS.text};letter-spacing:-0.01em;">${escapeHtml(text)}</h1>`;
}

export function paragraph(html: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${EMAIL_COLORS.text};">${html}</p>`;
}

export function smallPrint(html: string) {
  return `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${html}</p>`;
}
