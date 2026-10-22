import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailEvents, quotes } from "@/lib/db/schema";

export async function resolveQuoteFromInboundEmail(input: {
  inReplyTo?: string | null;
  references?: string | null;
  toAddresses?: string[];
  subject?: string | null;
}) {
  const candidateIds = new Set<string>();

  for (const header of [input.inReplyTo, input.references]) {
    if (!header) {
      continue;
    }
    const matches = header.match(/[a-f0-9-]{36}/gi) ?? [];
    for (const match of matches) {
      candidateIds.add(match);
    }
  }

  for (const messageId of candidateIds) {
    const [event] = await db
      .select({
        quoteId: emailEvents.quoteId,
        organizationId: emailEvents.organizationId,
      })
      .from(emailEvents)
      .where(eq(emailEvents.providerMessageId, messageId))
      .limit(1);

    if (event?.quoteId) {
      return event;
    }
  }

  const quoteTag = input.subject?.match(/QF-\d{4,}/i)?.[0];
  if (quoteTag) {
    const [quote] = await db
      .select({
        quoteId: quotes.id,
        organizationId: quotes.organizationId,
      })
      .from(quotes)
      .where(eq(quotes.quoteNumber, quoteTag.toUpperCase()))
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    if (quote) {
      return {
        quoteId: quote.quoteId,
        organizationId: quote.organizationId,
      };
    }
  }

  return null;
}
