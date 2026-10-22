"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { quotes, scheduledFollowUps } from "@/lib/db/schema";
import {
  assignQuoteSequence,
  getNextScheduledFollowUp,
} from "@/lib/follow-ups/schedule";
import { sendScheduledFollowUp } from "@/lib/follow-ups/send-follow-up";

export async function sendNextFollowUpNowAction(
  quoteId: string,
): Promise<ActionState & { sent?: boolean }> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const [quote] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!quote) {
    return { error: "Quote not found." };
  }

  const next = await getNextScheduledFollowUp(quoteId);
  if (!next) {
    return { error: "No scheduled follow-up to send." };
  }

  const result = await sendScheduledFollowUp(next.id, { force: true });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/dashboard");
  return { sent: true };
}

export async function snoozeNextFollowUpAction(
  quoteId: string,
  scheduledForIso: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const scheduledFor = new Date(scheduledForIso);
  if (Number.isNaN(scheduledFor.getTime())) {
    return { error: "Choose a valid date and time." };
  }

  const [quote] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!quote) {
    return { error: "Quote not found." };
  }

  const next = await getNextScheduledFollowUp(quoteId);
  if (!next) {
    return { error: "No upcoming follow-up to reschedule." };
  }

  await db
    .update(scheduledFollowUps)
    .set({ scheduledFor })
    .where(eq(scheduledFollowUps.id, next.id));

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function updateQuoteSequenceAction(
  quoteId: string,
  sequenceId: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  try {
    await assignQuoteSequence(
      quoteId,
      sequenceId,
      session.organization.id,
    );
  } catch {
    return { error: "Could not update sequence." };
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/dashboard");
  return {};
}
