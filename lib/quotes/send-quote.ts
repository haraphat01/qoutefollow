import { eq } from "drizzle-orm";

import { resolveEntitlements } from "@/lib/billing/entitlements";
import { db } from "@/lib/db";
import { activityLogs, conversations, emailEvents, quotes } from "@/lib/db/schema";
import { replyAddressForQuote } from "@/lib/email/reply-address";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { buildQuoteEmail } from "@/lib/email/templates";
import { createUnsubscribeToken, unsubscribeUrl } from "@/lib/email/unsubscribe";
import { scheduleFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { formatDate, formatMoney } from "@/lib/format";
import { logoUrl, publicQuoteUrl, quotePdfFileName } from "@/lib/quotes/branding";
import { newPublicToken } from "@/lib/quotes/create-quote";
import { quotePdfBytes } from "@/lib/quotes/pdf-response";
import { loadQuoteDocument, type QuoteDocument } from "@/lib/quotes/quote-document";
import { isEmailSuppressed } from "@/lib/suppressions";

/** The options, items and totals formatted for the quote email. */
export function quoteEmailPricing(document: QuoteDocument) {
  return {
    options: document.options.map((option) => ({
      name: option.name,
      items: option.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: formatMoney(item.unitPrice),
        amount: formatMoney(item.amount),
      })),
      subtotal: formatMoney(option.totals.subtotal),
      discount: option.totals.discount > 0 ? formatMoney(option.totals.discount) : null,
      tax: option.totals.tax > 0 ? formatMoney(option.totals.tax) : null,
      total: formatMoney(option.totals.total),
    })),
    discountLabel: document.discount?.type === "percent" ? `Discount (${document.discount.value}%)` : "Discount",
    taxLabel: `Tax (${document.taxRate}%)`,
  };
}

export type SendQuoteResult = { ok: true } | { ok: false; reason: string };

const OPEN_STATUSES = new Set(["draft", "pending", "paused"]);

/**
 * Email the estimate to the customer. Sending (or re-sending) opens a draft
 * and restarts the follow-up countdown from now, so Day 2 means two days
 * after the customer actually got the quote.
 */
export async function sendQuoteToCustomer(input: {
  organizationId: string;
  quoteId: string;
  userId: string;
}): Promise<SendQuoteResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, reason: "Email sending isn't set up yet (RESEND_API_KEY is missing)." };
  }

  const document = await loadQuoteDocument({
    organizationId: input.organizationId,
    quoteId: input.quoteId,
  });
  if (!document) {
    return { ok: false, reason: "Quote not found." };
  }
  const { quote, customer, organization } = document;

  if (!OPEN_STATUSES.has(quote.status)) {
    return { ok: false, reason: "Only open or draft quotes can be sent. Reopen it first." };
  }
  if (organization.suspendedAt) {
    return { ok: false, reason: "This workspace is suspended." };
  }
  const entitlements = resolveEntitlements({
    plan: organization.subscriptionPlan,
    status: organization.subscriptionStatus,
    trialEndsAt: organization.trialEndsAt,
  });
  if (!entitlements.canUseFollowUps) {
    return { ok: false, reason: "Sending quotes requires an active subscription or trial." };
  }
  if (await isEmailSuppressed(organization.id, customer.email)) {
    return {
      ok: false,
      reason: `${customer.email} unsubscribed or bounced, so we can't email them. Contact them another way.`,
    };
  }

  // Quotes created before online acceptance get their link the first time they're sent.
  if (!quote.publicToken) {
    quote.publicToken = newPublicToken();
    await db.update(quotes).set({ publicToken: quote.publicToken }).where(eq(quotes.id, quote.id));
  }

  const unsub = unsubscribeUrl(
    createUnsubscribeToken({ organizationId: organization.id, email: customer.email }),
  );
  const replyTo = replyAddressForQuote(quote.id) ?? organization.replyEmail;
  const email = buildQuoteEmail({
    businessName: organization.name,
    replyEmail: organization.replyEmail,
    businessPhone: organization.businessPhone,
    emailSignature: organization.emailSignature,
    mailingAddress: organization.mailingAddress,
    unsubscribeUrl: unsub,
    replyTo,
    logoUrl: logoUrl(organization),
    viewUrl: publicQuoteUrl(quote.publicToken),
    customerName: customer.name,
    quoteNumber: quote.quoteNumber,
    jobDescription: quote.jobDescription,
    ...quoteEmailPricing(document),
    quoteDate: formatDate(quote.quoteDate),
    expiresAt: quote.expiresAt ? formatDate(quote.expiresAt) : "",
  });
  const pdf = Buffer.from(await quotePdfBytes(document));

  let providerMessageId: string | null;
  try {
    providerMessageId = await sendTransactionalEmail({
      to: customer.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo,
      attachments: [
        { filename: quotePdfFileName(quote.quoteNumber, organization.name), content: pdf },
      ],
      headers: {
        "X-QuoteFollow-Quote-Id": quote.id,
        "X-QuoteFollow-Org-Id": organization.id,
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (error) {
    return {
      ok: false,
      reason: `The email couldn't be sent: ${error instanceof Error ? error.message : "unknown error"}.`,
    };
  }

  const now = new Date();
  await db
    .update(quotes)
    .set({
      sentAt: now,
      // Sending is a fresh start for drafts and paused quotes alike.
      status: "pending",
      approvedAt: now,
      updatedAt: now,
    })
    .where(eq(quotes.id, quote.id));

  await db.insert(emailEvents).values({
    organizationId: organization.id,
    quoteId: quote.id,
    providerMessageId,
    eventType: "sent",
    payload: JSON.stringify({ kind: "quote", to: customer.email, subject: email.subject }),
  });
  await db.insert(conversations).values({
    organizationId: organization.id,
    quoteId: quote.id,
    direction: "outbound",
    subject: email.subject,
    body: email.text,
    fromEmail: organization.replyEmail,
    toEmail: customer.email,
  });
  await db.insert(activityLogs).values({
    organizationId: organization.id,
    userId: input.userId,
    entityType: "quote",
    entityId: quote.id,
    action: quote.sentAt ? "resent" : "sent",
    metadata: JSON.stringify({ to: customer.email, amount: quote.amount }),
  });

  await scheduleFollowUpsForQuote(quote.id);
  return { ok: true };
}
