import { and, asc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alignToBusinessSendWindow,
  DEFAULT_SEND_TIMEZONE,
} from "@/lib/follow-ups/send-window";
import {
  followUpSequences,
  followUpSteps,
  organizations,
  quotes,
  scheduledFollowUps,
  type quoteStatusEnum,
} from "@/lib/db/schema";

const TERMINAL_STATUSES: (typeof quoteStatusEnum.enumValues)[number][] = [
  "accepted",
  "declined",
  "cancelled",
  "expired",
];

export async function cancelScheduledFollowUpsForQuote(quoteId: string) {
  await db
    .update(scheduledFollowUps)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(scheduledFollowUps.quoteId, quoteId),
        eq(scheduledFollowUps.status, "scheduled"),
      ),
    );
}

export async function scheduleFollowUpsForQuote(quoteId: string) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (
    !quote ||
    !quote.followUpsEnabled ||
    !quote.sequenceId ||
    !quote.approvedAt ||
    !quote.contactConfirmed
  ) {
    return;
  }

  if (TERMINAL_STATUSES.includes(quote.status)) {
    return;
  }

  await cancelScheduledFollowUpsForQuote(quoteId);

  const steps = await db
    .select()
    .from(followUpSteps)
    .where(
      and(
        eq(followUpSteps.sequenceId, quote.sequenceId),
        isNull(followUpSteps.archivedAt),
      ),
    )
    .orderBy(followUpSteps.sortOrder);

  const approvedAt = quote.approvedAt;

  const [org] = await db
    .select({ sendTimezone: organizations.sendTimezone })
    .from(organizations)
    .where(eq(organizations.id, quote.organizationId))
    .limit(1);
  const timeZone = org?.sendTimezone ?? DEFAULT_SEND_TIMEZONE;

  const existing = await db
    .select()
    .from(scheduledFollowUps)
    .where(eq(scheduledFollowUps.quoteId, quote.id));

  const existingByStepId = new Map(existing.map((row) => [row.stepId, row]));
  const toInsert: (typeof scheduledFollowUps.$inferInsert)[] = [];
  const now = new Date();
  // When a quote resumes after a pause, overdue steps would all fire at once.
  // Shift the remaining steps so the first one goes out now and the original
  // spacing between steps is kept.
  let shiftMs = 0;

  for (const step of steps) {
    const prev = existingByStepId.get(step.id);
    if (prev && (prev.status === "sent" || prev.status === "skipped")) {
      continue;
    }

    const scheduledFor = new Date(approvedAt);
    scheduledFor.setDate(scheduledFor.getDate() + step.dayOffset);
    if (shiftMs === 0 && scheduledFor < now) {
      shiftMs = now.getTime() - scheduledFor.getTime();
    }
    const aligned = alignToBusinessSendWindow(
      new Date(scheduledFor.getTime() + shiftMs),
      timeZone,
    );

    if (prev) {
      await db
        .update(scheduledFollowUps)
        .set({
          scheduledFor: aligned,
          status: "scheduled",
          lastError: null,
          nextRetryAt: null,
          processingStartedAt: null,
        })
        .where(eq(scheduledFollowUps.id, prev.id));
      continue;
    }

    toInsert.push({
      organizationId: quote.organizationId,
      quoteId: quote.id,
      stepId: step.id,
      scheduledFor: aligned,
      status: "scheduled",
      idempotencyKey: `${quote.id}:${step.id}`,
    });
  }

  if (toInsert.length > 0) {
    await db.insert(scheduledFollowUps).values(toInsert);
  }
}

export async function syncQuoteFollowUpEligibility(
  quoteId: string,
  status: (typeof quoteStatusEnum.enumValues)[number],
) {
  if (TERMINAL_STATUSES.includes(status) || status === "paused" || status === "draft") {
    await cancelScheduledFollowUpsForQuote(quoteId);
    return;
  }

  if (status === "pending") {
    await scheduleFollowUpsForQuote(quoteId);
  }
}

export function isQuoteEligibleForAutomation(
  status: (typeof quoteStatusEnum.enumValues)[number],
) {
  return !TERMINAL_STATUSES.includes(status) && status !== "paused" && status !== "draft";
}

export async function getNextScheduledFollowUp(quoteId: string) {
  const [row] = await db
    .select()
    .from(scheduledFollowUps)
    .where(
      and(
        eq(scheduledFollowUps.quoteId, quoteId),
        eq(scheduledFollowUps.status, "scheduled"),
      ),
    )
    .orderBy(asc(scheduledFollowUps.scheduledFor))
    .limit(1);

  return row ?? null;
}

export async function assignQuoteSequence(
  quoteId: string,
  sequenceId: string,
  organizationId: string,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(
      and(eq(quotes.id, quoteId), eq(quotes.organizationId, organizationId)),
    )
    .limit(1);

  if (!quote) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  const [sequence] = await db
    .select({ id: followUpSequences.id })
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.id, sequenceId),
        eq(followUpSequences.organizationId, organizationId),
        isNull(followUpSequences.archivedAt),
      ),
    )
    .limit(1);

  if (!sequence) {
    throw new Error("SEQUENCE_NOT_FOUND");
  }

  await db
    .update(quotes)
    .set({ sequenceId, updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  if (quote.status === "pending" && quote.contactConfirmed) {
    await scheduleFollowUpsForQuote(quoteId);
  }
}

export async function rescheduleOpenQuotesForSequence(sequenceId: string) {
  const openQuotes = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(
      and(eq(quotes.sequenceId, sequenceId), eq(quotes.status, "pending")),
    );

  for (const quote of openQuotes) {
    await scheduleFollowUpsForQuote(quote.id);
  }
}

/** Mark open quotes past their expiration date as expired and stop their follow-ups. */
export async function expireOverdueQuotes(now = new Date()) {
  const expired = await db
    .update(quotes)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        inArray(quotes.status, ["draft", "pending", "paused"]),
        isNotNull(quotes.expiresAt),
        lt(quotes.expiresAt, now),
      ),
    )
    .returning({ id: quotes.id });

  for (const quote of expired) {
    await cancelScheduledFollowUpsForQuote(quote.id);
  }

  return expired.length;
}
