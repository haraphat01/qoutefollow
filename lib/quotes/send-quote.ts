import { and, eq } from "drizzle-orm";

import { resolveEntitlements } from "@/lib/billing/entitlements";
import { db } from "@/lib/db";
import {
  activityLogs,
  conversations,
  customers,
  emailEvents,
  organizations,
  quotes,
} from "@/lib/db/schema";
import { replyAddressForQuote } from "@/lib/email/reply-address";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { buildQuoteEmail } from "@/lib/email/templates";
import { createUnsubscribeToken, unsubscribeUrl } from "@/lib/email/unsubscribe";
import { scheduleFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { formatDate, formatMoney } from "@/lib/format";
import { lineTotal } from "@/lib/quotes/line-items";
import { listQuoteLineItems } from "@/lib/quotes/save-line-items";
import { isEmailSuppressed } from "@/lib/suppressions";

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

  const [row] = await db
    .select({ quote: quotes, customer: customers, organization: organizations })
    .from(quotes)
    .innerJoin(customers, eq(customers.id, quotes.customerId))
    .innerJoin(organizations, eq(organizations.id, quotes.organizationId))
    .where(and(eq(quotes.id, input.quoteId), eq(quotes.organizationId, input.organizationId)))
    .limit(1);

  if (!row) {
    return { ok: false, reason: "Quote not found." };
  }
  const { quote, customer, organization } = row;

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

  const items = await listQuoteLineItems(quote.id);
  const lines =
    items.length > 0
      ? items
      : [{ description: quote.jobDescription, quantity: 1, unitPrice: Number(quote.amount) }];

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
    customerName: customer.name,
    quoteNumber: quote.quoteNumber,
    jobDescription: quote.jobDescription,
    items: lines.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: formatMoney(item.unitPrice),
      amount: formatMoney(lineTotal(item)),
    })),
    total: formatMoney(quote.amount),
    quoteDate: formatDate(quote.quoteDate),
    expiresAt: quote.expiresAt ? formatDate(quote.expiresAt) : "",
  });

  let providerMessageId: string | null;
  try {
    providerMessageId = await sendTransactionalEmail({
      to: customer.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo,
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
