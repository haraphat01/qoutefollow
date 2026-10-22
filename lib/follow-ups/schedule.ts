import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alignToBusinessSendWindow,
  DEFAULT_SEND_TIMEZONE,
} from "@/lib/follow-ups/send-window";
import {
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
    .where(eq(followUpSteps.sequenceId, quote.sequenceId))
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

  for (const step of steps) {
    const scheduledFor = new Date(approvedAt);
    scheduledFor.setDate(scheduledFor.getDate() + step.dayOffset);
    const aligned = alignToBusinessSendWindow(scheduledFor, timeZone);

    const prev = existingByStepId.get(step.id);
    if (prev) {
      if (prev.status === "sent" || prev.status === "skipped") {
        continue;
      }

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
