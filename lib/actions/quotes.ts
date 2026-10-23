"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activityLogs, quotes } from "@/lib/db/schema";
import {
  cancelScheduledFollowUpsForQuote,
  scheduleFollowUpsForQuote,
  syncQuoteFollowUpEligibility,
} from "@/lib/follow-ups/schedule";
import { createQuoteFromInput } from "@/lib/quotes/create-quote";
import {
  quoteSchema,
  quoteStatusSchema,
  updateQuoteSchema,
} from "@/lib/validations/quote";

import { parseDateInput } from "@/lib/format";

import type { ActionState } from "./auth";

function parseFollowUpsEnabled(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export async function createQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = quoteSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    customerName: formData.get("customerName") || undefined,
    customerEmail: formData.get("customerEmail") || undefined,
    amount: formData.get("amount"),
    jobDescription: formData.get("jobDescription"),
    quoteDate: formData.get("quoteDate"),
    expiresAt: formData.get("expiresAt") || undefined,
    notes: formData.get("notes") || undefined,
    status: formData.get("status"),
    followUpsEnabled: parseFollowUpsEnabled(formData.get("followUpsEnabled")),
    sequenceId: formData.get("sequenceId") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  let quoteId: string;
  try {
    const quote = await createQuoteFromInput({
      organizationId: session.organization.id,
      userId: session.user.id,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      amount: data.amount,
      jobDescription: data.jobDescription,
      quoteDate: parseDateInput(data.quoteDate),
      expiresAt: data.expiresAt ? parseDateInput(data.expiresAt, "end") : null,
      notes: data.notes,
      status: data.status,
      followUpsEnabled: data.followUpsEnabled ?? true,
      contactConfirmed: true,
      sequenceId: data.sequenceId,
    });
    quoteId = quote.id;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CUSTOMER_REQUIRED") {
        return {
          error: "Select an existing customer or enter name and email.",
        };
      }
      if (error.message === "CUSTOMER_NOT_FOUND") {
        return { error: "Customer not found." };
      }
    }
    return { error: "Could not save quote." };
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(`/quotes/${quoteId}`);
}

export async function updateQuoteStatusAction(
  quoteId: string,
  status: (typeof quotes.$inferSelect)["status"],
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsedStatus = quoteStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { error: "Invalid status." };
  }

  const [existing] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return { error: "Quote not found." };
  }

  const approvedAt =
    status === "pending" && !existing.approvedAt
      ? new Date()
      : existing.approvedAt;

  await db
    .update(quotes)
    .set({
      status,
      approvedAt,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  await syncQuoteFollowUpEligibility(quoteId, status);

  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "quote",
    entityId: quoteId,
    action: "status_changed",
    metadata: JSON.stringify({ from: existing.status, to: status }),
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");

  return {};
}

export async function updateQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateQuoteSchema.safeParse({
    quoteId: formData.get("quoteId"),
    amount: formData.get("amount"),
    jobDescription: formData.get("jobDescription"),
    quoteDate: formData.get("quoteDate"),
    expiresAt: formData.get("expiresAt") || undefined,
    notes: formData.get("notes") || undefined,
    followUpsEnabled: parseFollowUpsEnabled(formData.get("followUpsEnabled")),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const [existing] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, data.quoteId),
        eq(quotes.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return { error: "Quote not found." };
  }

  const expiresAt = data.expiresAt
    ? parseDateInput(data.expiresAt, "end")
    : null;
  // Extending the expiration date reopens an expired quote.
  const reopened =
    existing.status === "expired" && expiresAt && expiresAt > new Date();

  await db
    .update(quotes)
    .set({
      amount: data.amount.toFixed(2),
      jobDescription: data.jobDescription,
      quoteDate: parseDateInput(data.quoteDate),
      expiresAt,
      notes: data.notes ?? null,
      followUpsEnabled: data.followUpsEnabled,
      status: reopened ? "pending" : existing.status,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, existing.id));

  const status = reopened ? "pending" : existing.status;
  if (!data.followUpsEnabled) {
    await cancelScheduledFollowUpsForQuote(existing.id);
  } else if (status === "pending") {
    // Picks up a re-enabled toggle and keeps urgency/expiry in sync.
    await scheduleFollowUpsForQuote(existing.id);
  }

  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "quote",
    entityId: existing.id,
    action: "updated",
    metadata: JSON.stringify({ followUpsEnabled: data.followUpsEnabled }),
  });

  revalidatePath(`/quotes/${existing.id}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes/${existing.id}`);
}
