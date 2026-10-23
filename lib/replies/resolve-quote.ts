import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, emailEvents, quotes } from "@/lib/db/schema";
import { quoteIdFromReplyAddresses } from "@/lib/email/reply-address";
import { parseEmailFromAddress } from "@/lib/email/sending-domain";

export async function resolveQuoteFromInboundEmail(input: {
  fromEmail?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  toAddresses?: string[];
  subject?: string | null;
}) {
  // 1. Per-quote reply address (reply+<quoteId>@INBOUND_REPLY_DOMAIN).
  const taggedQuoteId = quoteIdFromReplyAddresses(input.toAddresses ?? []);
  if (taggedQuoteId) {
    const [quote] = await db
      .select({ quoteId: quotes.id, organizationId: quotes.organizationId })
      .from(quotes)
      .where(eq(quotes.id, taggedQuoteId))
      .limit(1);
    if (quote) {
      return quote;
    }
  }

  // 2. Threading headers that reference a provider message id we sent.
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
      return { quoteId: event.quoteId, organizationId: event.organizationId };
    }
  }

  // 3. Quote number in the subject — quote numbers are only unique per
  // organization, so the sender must match that quote's customer.
  const fromAddress = parseEmailFromAddress(input.fromEmail ?? undefined)?.address;
  if (!fromAddress) {
    return null;
  }

  const quoteTag = input.subject?.match(/QF-\d{4,}/i)?.[0];
  if (quoteTag) {
    const [quote] = await db
      .select({ quoteId: quotes.id, organizationId: quotes.organizationId })
      .from(quotes)
      .innerJoin(customers, eq(quotes.customerId, customers.id))
      .where(
        and(
          eq(quotes.quoteNumber, quoteTag.toUpperCase()),
          eq(sql`lower(${customers.email})`, fromAddress),
        ),
      )
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    if (quote) {
      return quote;
    }
  }

  // 4. Sender has exactly one quote with active automation.
  const openQuotes = await db
    .select({ quoteId: quotes.id, organizationId: quotes.organizationId })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(sql`lower(${customers.email})`, fromAddress),
        inArray(quotes.status, ["pending"]),
      ),
    )
    .limit(2);

  if (openQuotes.length === 1) {
    return openQuotes[0];
  }

  return null;
}
