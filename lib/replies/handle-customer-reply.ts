import { eq } from "drizzle-orm";

import { classifyCustomerReply } from "@/lib/ai/classify-customer-reply";
import { parseEmailFromAddress } from "@/lib/email/sending-domain";
import { db } from "@/lib/db";
import {
  activityLogs,
  conversations,
  customers,
  notifications,
  organizations,
  quotes,
} from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { inboundReplyDomain } from "@/lib/email/reply-address";
import { buildReplyForwardEmail } from "@/lib/email/account-emails";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { emailCustomerReplyAlert } from "@/lib/email/team-alerts";
import { appUrl } from "@/lib/billing/stripe";

/**
 * With a per-quote Reply-To the customer's reply lands in QuoteFollow, not the
 * contractor's inbox — forward a copy so they can answer it directly.
 */
async function forwardReplyToContractor(input: {
  organizationId: string;
  quoteId: string;
  quoteNumber: string;
  fromEmail: string;
  subject: string | null;
  body: string;
  summary: string | null;
}) {
  if (!inboundReplyDomain()) {
    return null;
  }

  const [org] = await db
    .select({ replyEmail: organizations.replyEmail })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1);

  if (!org?.replyEmail) {
    return null;
  }

  const email = buildReplyForwardEmail({
    quoteNumber: input.quoteNumber,
    customerEmail: input.fromEmail,
    customerSubject: input.subject,
    summary: input.summary,
    body: input.body,
    url: appUrl(`/quotes/${input.quoteId}`),
  });

  await sendTransactionalEmail({
    to: org.replyEmail,
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: input.fromEmail,
  });
  return org.replyEmail;
}

export async function handleCustomerReply(input: {
  organizationId: string;
  quoteId: string;
  fromEmail: string;
  subject?: string | null;
  body: string;
}) {
  const [row] = await db
    .select({
      quote: quotes,
      customerEmail: customers.email,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(eq(quotes.id, input.quoteId))
    .limit(1);

  if (!row || row.quote.organizationId !== input.organizationId) {
    return { handled: false as const, reason: "quote_not_found" };
  }

  const quote = row.quote;
  const fromAddress =
    parseEmailFromAddress(input.fromEmail)?.address ??
    input.fromEmail.toLowerCase().trim();

  if (fromAddress !== row.customerEmail.toLowerCase()) {
    return { handled: false as const, reason: "sender_mismatch" };
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      organizationId: input.organizationId,
      quoteId: input.quoteId,
      direction: "inbound",
      subject: input.subject ?? null,
      body: input.body,
      fromEmail: input.fromEmail.toLowerCase(),
      toEmail: null,
    })
    .returning();

  let classificationSummary: string | null = null;
  let suggestedStatus: string | null = null;
  let classificationLabel: string | null = null;

  try {
    const classified = await classifyCustomerReply({
      quoteNumber: quote.quoteNumber,
      jobDescription: quote.jobDescription,
      body: input.body,
    });

    if (classified) {
      classificationSummary = classified.summary;
      suggestedStatus = classified.suggestedQuoteStatus;
      classificationLabel = classified.classification;
      await db
        .update(conversations)
        .set({
          replyClassification: classified.classification,
          suggestedQuoteStatus: classified.suggestedQuoteStatus,
          aiSummary: classified.summary,
        })
        .where(eq(conversations.id, conversation.id));
    }
  } catch {
    // Reply handling must succeed even if classification fails.
  }

  if (quote.status !== "paused") {
    await db
      .update(quotes)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(quotes.id, input.quoteId));
  }

  await cancelScheduledFollowUpsForQuote(input.quoteId);

  await db.insert(activityLogs).values({
    organizationId: input.organizationId,
    entityType: "quote",
    entityId: input.quoteId,
    action: "customer_replied",
    metadata: JSON.stringify({
      fromEmail: input.fromEmail,
      classification: classificationLabel,
      suggestedQuoteStatus: suggestedStatus,
    }),
  });

  const insightLine = classificationSummary
    ? ` AI read: ${classificationSummary}`
    : "";

  const suggestionLine = suggestedStatus
    ? ` Suggested status: ${suggestedStatus}.`
    : "";

  await db.insert(notifications).values({
    organizationId: input.organizationId,
    quoteId: input.quoteId,
    type: "customer_replied",
    title: `Customer replied on ${quote.quoteNumber}`,
    body: `${input.fromEmail} replied.${insightLine}${suggestionLine} Automation is paused until you update the quote.`,
  });

  const forwardedTo = await forwardReplyToContractor({
    organizationId: input.organizationId,
    quoteNumber: quote.quoteNumber,
    quoteId: input.quoteId,
    fromEmail: fromAddress,
    subject: input.subject ?? null,
    body: input.body,
    summary: classificationSummary,
  }).catch(() => null);

  // The reply is recorded and shown in-app even if these emails fail.
  await emailCustomerReplyAlert({
    organizationId: input.organizationId,
    quoteId: input.quoteId,
    quoteNumber: quote.quoteNumber,
    customerEmail: fromAddress,
    body: input.body,
    summary: classificationSummary,
    skipEmail: forwardedTo,
  }).catch(() => undefined);

  return {
    handled: true as const,
    quoteId: input.quoteId,
    classification: classificationLabel,
    suggestedQuoteStatus: suggestedStatus,
    summary: classificationSummary,
  };
}

export { formatClassificationLabel } from "@/lib/replies/classification-labels";
