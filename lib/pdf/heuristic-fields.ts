import type { ExtractedQuoteFields } from "@/lib/ai/extract-quote-fields";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MONEY_PATTERN = /\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/;

function toIsoDate(raw: string) {
  const us = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return raw;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function findLabeledDate(text: string, labels: string) {
  const pattern = new RegExp(
    `(?:${labels})\\s*(?:date)?\\s*[:#-]?\\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Z][a-z]{2,8}\\.? [0-9]{1,2},? [0-9]{4})`,
    "i",
  );
  const match = text.match(pattern);
  return match ? toIsoDate(match[1].trim()) : null;
}

function findAmount(text: string) {
  const lines = text.split(/\r?\n/);
  const totalLine = [...lines]
    .reverse()
    .find((line) => /\b(grand total|total due|amount due|estimate total|total)\b/i.test(line) && MONEY_PATTERN.test(line));
  const source = totalLine ?? text;
  const match = source.match(MONEY_PATTERN);
  if (!match) {
    return null;
  }
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Best-effort extraction used when AI extraction is unavailable. Every field
 * is still reviewed and confirmed by the contractor before saving.
 */
export function extractQuoteFieldsHeuristically(
  text: string,
  options: { excludeEmails?: string[] } = {},
): ExtractedQuoteFields {
  const excluded = new Set(
    (options.excludeEmails ?? []).map((email) => email.toLowerCase()),
  );
  const emails = (text.match(EMAIL_PATTERN) ?? []).filter(
    (email) => !excluded.has(email.toLowerCase()),
  );

  // The contractor's own address is usually in the letterhead, so prefer an
  // email at or after the customer label, then the last one in the document.
  const customerLabel = text.search(/\b(?:customer|client|bill to|prepared for|homeowner)\b/i);
  const afterLabel =
    customerLabel >= 0
      ? text.slice(customerLabel).match(EMAIL_PATTERN)?.find(
          (email) => !excluded.has(email.toLowerCase()),
        )
      : undefined;

  const estimateNumber =
    text
      .match(/\b(?:estimate|quote|proposal|invoice)\s*(?:no\.?|number|#)\s*[:#]?\s*([A-Z0-9-]{2,})/i)?.[1]
      ?.trim() ?? null;

  const customerName =
    text
      .match(/\b(?:customer|client|bill to|prepared for|homeowner)\s*(?:name)?\s*[:-]\s*([^\n\r]{2,60})/i)?.[1]
      ?.trim() ?? null;

  const amount = findAmount(text);
  const customerEmail = (afterLabel ?? emails.at(-1))?.toLowerCase() ?? null;

  const found = [customerEmail, amount, estimateNumber, customerName].filter(
    (value) => value !== null,
  ).length;

  return {
    customerName,
    customerEmail,
    estimateNumber,
    amount,
    jobDescription: null,
    quoteDate: findLabeledDate(text, "estimate|quote|proposal|issued|date"),
    expirationDate: findLabeledDate(text, "valid until|expires|expiration|expiry"),
    notes: null,
    confidence: found >= 3 ? "medium" : "low",
  };
}
