"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { syncQuoteFollowUpEligibility } from "@/lib/follow-ups/schedule";
import { createQuoteFromInput } from "@/lib/quotes/create-quote";
import { quoteSchema } from "@/lib/validations/quote";

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

  try {
    const quote = await createQuoteFromInput({
      organizationId: session.organization.id,
      userId: session.user.id,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      amount: data.amount,
      jobDescription: data.jobDescription,
      quoteDate: new Date(data.quoteDate),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      notes: data.notes,
      status: data.status,
      followUpsEnabled: data.followUpsEnabled ?? true,
      contactConfirmed: true,
      sequenceId: data.sequenceId,
    });

    revalidatePath("/quotes");
    revalidatePath("/dashboard");
    redirect(`/quotes/${quote.id}`);
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
}

export async function updateQuoteStatusAction(
  quoteId: string,
  status: (typeof quotes.$inferSelect)["status"],
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
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

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");

  return {};
}
