import { eq } from "drizzle-orm";

import { classifyCustomerReply } from "@/lib/ai/classify-customer-reply";
import { parseEmailFromAddress } from "@/lib/email/sending-domain";
import { formatClassificationLabel } from "@/lib/replies/classification-labels";
import { db } from "@/lib/db";
import {
  activityLogs,
  conversations,
  customers,
  notifications,
  quotes,
} from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";

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

  return {
    handled: true as const,
    quoteId: input.quoteId,
    classification: classificationLabel,
    suggestedQuoteStatus: suggestedStatus,
    summary: classificationSummary,
  };
}

export { formatClassificationLabel } from "@/lib/replies/classification-labels";
