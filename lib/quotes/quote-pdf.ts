import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { formatDate, formatMoney } from "@/lib/format";
import type { QuoteDocument } from "@/lib/quotes/quote-document";

const PAGE = { width: 612, height: 792, margin: 48 };
const INK = rgb(0.12, 0.2, 0.16);
const MUTED = rgb(0.4, 0.46, 0.42);
const RULE = rgb(0.86, 0.89, 0.85);
const PANEL = rgb(0.96, 0.97, 0.95);
const BRAND = rgb(0.16, 0.34, 0.26);

/**
 * The standard PDF fonts only cover Windows-1252. Swap characters they can't
 * draw (emoji, most non-Latin scripts) for "?" instead of failing the PDF.
 */
function safeText(font: PDFFont, text: string) {
  let out = "";
  for (const char of text.replace(/\r/g, "")) {
    try {
      font.encodeText(char);
      out += char;
    } catch {
      out += char === "\t" ? " " : "?";
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of safeText(font, text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Break words longer than the column.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.page = doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
  }
  ensure(height: number) {
    if (this.y - height < PAGE.margin + 24) {
      this.page = this.doc.addPage([PAGE.width, PAGE.height]);
      this.y = PAGE.height - PAGE.margin;
    }
  }
  text(value: string, x: number, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right"; y?: number } = {}) {
    const size = options.size ?? 10;
    const font = options.font ?? this.regular;
    const safe = safeText(font, value);
    const width = font.widthOfTextAtSize(safe, size);
    this.page.drawText(safe, {
      x: options.align === "right" ? x - width : x,
      y: options.y ?? this.y,
      size,
      font,
      color: options.color ?? INK,
    });
  }
  rule(color = RULE) {
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.75,
      color,
    });
  }
}

export async function buildQuotePdf(
  document: QuoteDocument,
  options: { logo?: Buffer | null; acceptUrl?: string | null } = {},
) {
  const { quote, customer, organization } = document;
  const doc = await PDFDocument.create();
  doc.setTitle(`Estimate ${quote.quoteNumber} — ${organization.name}`);
  doc.setAuthor(organization.name);
  doc.setCreator("QuoteFollow");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, regular, bold);
  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;
  const contentWidth = right - left;

  // Header: logo (or business name) on the left, estimate details on the right.
  let logo: PDFImage | null = null;
  if (options.logo) {
    try {
      logo = options.logo[0] === 0x89 ? await doc.embedPng(options.logo) : await doc.embedJpg(options.logo);
    } catch {
      logo = null;
    }
  }
  const headerTop = w.y;
  if (logo) {
    const scale = Math.min(150 / logo.width, 56 / logo.height, 1);
    const height = logo.height * scale;
    w.page.drawImage(logo, { x: left, y: headerTop - height + 10, width: logo.width * scale, height });
    w.text(organization.name, left, { size: 11, font: bold, y: headerTop - height - 6 });
  } else {
    w.text(organization.name, left, { size: 18, font: bold, color: BRAND });
  }
  w.text("ESTIMATE", right, { size: 20, font: bold, align: "right", color: BRAND });
  w.text(quote.quoteNumber, right, { size: 11, font: bold, align: "right", y: headerTop - 20 });
  w.text(`Date: ${formatDate(quote.quoteDate)}`, right, { size: 9, align: "right", color: MUTED, y: headerTop - 34 });
  if (quote.expiresAt) {
    w.text(`Valid until: ${formatDate(quote.expiresAt)}`, right, { size: 9, align: "right", color: MUTED, y: headerTop - 46 });
  }
  w.y = headerTop - (logo ? 84 : 64);

  // Parties
  const colWidth = contentWidth / 2 - 10;
  const from = [organization.businessPhone, organization.replyEmail, organization.mailingAddress]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => wrap(regular, value, 9, colWidth));
  const to = [customer.name, customer.email, customer.phone]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => wrap(regular, value, 9, colWidth));
  w.text("PREPARED FOR", left, { size: 8, font: bold, color: MUTED });
  w.text("FROM", left + contentWidth / 2, { size: 8, font: bold, color: MUTED });
  const partiesTop = w.y - 14;
  to.forEach((line, index) => w.text(line, left, { size: 9.5, y: partiesTop - index * 13, font: index === 0 ? bold : regular }));
  [organization.name, ...from].forEach((line, index) =>
    w.text(line, left + contentWidth / 2, { size: 9.5, y: partiesTop - index * 13, font: index === 0 ? bold : regular }),
  );
  w.y = partiesTop - Math.max(to.length, from.length + 1) * 13 - 14;

  // Job description
  w.ensure(40);
  w.text("JOB", left, { size: 8, font: bold, color: MUTED });
  w.y -= 14;
  for (const line of wrap(regular, quote.jobDescription, 10, contentWidth)) {
    w.ensure(14);
    w.text(line, left, { size: 10 });
    w.y -= 14;
  }
  w.y -= 8;

  const cols = { qty: right - 190, price: right - 95, amount: right };
  const descWidth = cols.qty - 40 - left;
  const multiple = document.options.length > 1;

  document.options.forEach((option, optionIndex) => {
    const chosen = document.acceptedOptionIndex === optionIndex;
    w.ensure(70);
    if (multiple) {
      w.text(`Option ${optionIndex + 1}: ${option.name ?? ""}${chosen ? "  (accepted)" : ""}`, left, { size: 12, font: bold, color: chosen ? BRAND : INK });
      w.y -= 18;
    }
    w.page.drawRectangle({ x: left, y: w.y - 5, width: contentWidth, height: 18, color: PANEL });
    w.text("ITEM", left + 6, { size: 8, font: bold, color: MUTED });
    w.text("QTY", cols.qty, { size: 8, font: bold, color: MUTED, align: "right" });
    w.text("UNIT PRICE", cols.price, { size: 8, font: bold, color: MUTED, align: "right" });
    w.text("AMOUNT", cols.amount - 6, { size: 8, font: bold, color: MUTED, align: "right" });
    w.y -= 22;

    for (const item of option.items) {
      const lines = wrap(regular, item.description, 9.5, descWidth);
      w.ensure(lines.length * 12 + 10);
      lines.forEach((line, index) => w.text(line, left + 6, { size: 9.5, y: w.y - index * 12 }));
      w.text(String(item.quantity), cols.qty, { size: 9.5, align: "right" });
      w.text(formatMoney(item.unitPrice), cols.price, { size: 9.5, align: "right" });
      w.text(formatMoney(item.amount), cols.amount - 6, { size: 9.5, align: "right" });
      w.y -= lines.length * 12 + 4;
      w.rule();
      w.y -= 12;
    }

    const rows: [string, string, boolean][] = [["Subtotal", formatMoney(option.totals.subtotal), false]];
    if (option.totals.discount > 0) {
      const label = document.discount?.type === "percent" ? `Discount (${document.discount.value}%)` : "Discount";
      rows.push([label, `-${formatMoney(option.totals.discount)}`, false]);
    }
    if (option.totals.tax > 0) {
      rows.push([`Tax (${document.taxRate}%)`, formatMoney(option.totals.tax), false]);
    }
    rows.push(["Total", formatMoney(option.totals.total), true]);
    w.ensure(rows.length * 16 + 10);
    for (const [label, value, strong] of rows) {
      w.text(label, cols.price - 70, { size: strong ? 11 : 9.5, font: strong ? bold : regular, color: strong ? INK : MUTED });
      w.text(value, cols.amount - 6, { size: strong ? 12 : 9.5, font: strong ? bold : regular, align: "right" });
      w.y -= strong ? 20 : 15;
    }
    w.y -= multiple ? 14 : 6;
  });

  // Acceptance or call to action
  w.ensure(60);
  if (quote.acceptedAt && quote.acceptedName) {
    w.page.drawRectangle({ x: left, y: w.y - 34, width: contentWidth, height: 46, color: PANEL, borderColor: BRAND, borderWidth: 0.75 });
    w.text("ACCEPTED", left + 12, { size: 8, font: bold, color: BRAND });
    w.text(
      `Signed by ${quote.acceptedName} on ${formatDate(quote.acceptedAt)}${multiple && document.acceptedOptionIndex !== null ? ` · ${document.options[document.acceptedOptionIndex].name}` : ""}`,
      left + 12,
      { size: 10, font: bold, y: w.y - 16 },
    );
    w.y -= 52;
  } else if (options.acceptUrl) {
    w.text("Ready to go ahead? View and accept this estimate online:", left, { size: 10, font: bold });
    w.y -= 14;
    for (const line of wrap(regular, options.acceptUrl, 9, contentWidth)) {
      w.text(line, left, { size: 9, color: BRAND });
      w.y -= 12;
    }
  }

  // Page footer
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const footer = safeText(regular, `${organization.name} · Estimate ${quote.quoteNumber} · Page ${index + 1} of ${pages.length}`);
    page.drawText(footer, {
      x: PAGE.width / 2 - regular.widthOfTextAtSize(footer, 8) / 2,
      y: PAGE.margin - 20,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  return doc.save();
}
