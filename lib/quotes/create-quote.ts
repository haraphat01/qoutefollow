import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activityLogs,
  customers,
  followUpSequences,
  quoteDocuments,
  quotes,
} from "@/lib/db/schema";
import { scheduleFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { nextQuoteNumber } from "@/lib/quotes/numbers";

export type CreateQuoteInput = {
  organizationId: string;
  userId: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  jobDescription: string;
  quoteDate: Date;
  expiresAt?: Date | null;
  notes?: string | null;
  status: (typeof quotes.$inferInsert)["status"];
  followUpsEnabled: boolean;
  contactConfirmed: boolean;
  quoteNumberOverride?: string | null;
  documentId?: string | null;
  sequenceId?: string | null;
};

export async function createQuoteFromInput(input: CreateQuoteInput) {
  let customerId = input.customerId;

  if (!customerId) {
    if (!input.customerName || !input.customerEmail) {
      throw new Error("CUSTOMER_REQUIRED");
    }

    const email = input.customerEmail.toLowerCase();
    const [existingByEmail] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, input.organizationId),
          eq(customers.email, email),
        ),
      )
      .limit(1);

    if (existingByEmail) {
      customerId = existingByEmail.id;
    } else {
      const [customer] = await db
        .insert(customers)
        .values({
          organizationId: input.organizationId,
          name: input.customerName,
          email,
        })
        .returning();
      customerId = customer.id;
    }
  } else {
    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, input.organizationId),
        ),
      )
      .limit(1);

    if (!existing.length) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }
  }

  let resolvedSequenceId = input.sequenceId ?? null;

  if (resolvedSequenceId) {
    const [chosen] = await db
      .select({ id: followUpSequences.id })
      .from(followUpSequences)
      .where(
        and(
          eq(followUpSequences.id, resolvedSequenceId),
          eq(followUpSequences.organizationId, input.organizationId),
          isNull(followUpSequences.archivedAt),
        ),
      )
      .limit(1);
    if (!chosen) {
      resolvedSequenceId = null;
    }
  }

  if (!resolvedSequenceId) {
    const [defaultSequence] = await db
      .select({ id: followUpSequences.id })
      .from(followUpSequences)
      .where(
        and(
          eq(followUpSequences.organizationId, input.organizationId),
          eq(followUpSequences.isDefault, true),
        ),
      )
      .limit(1);
    resolvedSequenceId = defaultSequence?.id ?? null;
  }

  const quoteNumber =
    input.quoteNumberOverride?.trim() ||
    (await nextQuoteNumber(input.organizationId));

  const approvedAt = input.status === "pending" ? new Date() : null;

  const [quote] = await db
    .insert(quotes)
    .values({
      organizationId: input.organizationId,
      customerId,
      quoteNumber,
      amount: input.amount.toFixed(2),
      jobDescription: input.jobDescription,
      quoteDate: input.quoteDate,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? null,
      status: input.status,
      followUpsEnabled: input.followUpsEnabled,
      contactConfirmed: input.contactConfirmed,
      sequenceId: resolvedSequenceId,
      approvedAt,
    })
    .returning();

  if (input.documentId) {
    await db
      .update(quoteDocuments)
      .set({ quoteId: quote.id })
      .where(
        and(
          eq(quoteDocuments.id, input.documentId),
          eq(quoteDocuments.organizationId, input.organizationId),
        ),
      );
  }

  await db.insert(activityLogs).values({
    organizationId: input.organizationId,
    userId: input.userId,
    entityType: "quote",
    entityId: quote.id,
    action: "created",
    metadata: JSON.stringify({
      status: quote.status,
      source: input.documentId ? "pdf_import" : "manual",
    }),
  });

  if (quote.status === "pending" && quote.contactConfirmed) {
    await scheduleFollowUpsForQuote(quote.id);
  }

  return quote;
}
