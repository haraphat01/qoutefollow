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
import { resolveAssignee } from "@/lib/quotes/assignee";
import { parsePricingField } from "@/lib/quotes/pricing";
import { sendQuoteToCustomer } from "@/lib/quotes/send-quote";
import { pricingColumns, saveQuotePricing } from "@/lib/quotes/save-line-items";
import {
  quoteSchema,
  quoteStatusSchema,
  updateQuoteSchema,
} from "@/lib/validations/quote";

import { formatMoney, parseDateInput } from "@/lib/format";
import { appUrl } from "@/lib/billing/stripe";
import {
  accountEmailsEnabled,
  buildQuoteAssignedEmail,
  sendAccountEmail,
} from "@/lib/email/account-emails";
import { listOrganizationMembers } from "@/lib/queries/members";
import { loadQuoteDocument } from "@/lib/quotes/quote-document";

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
    jobDescription: formData.get("jobDescription"),
    quoteDate: formData.get("quoteDate"),
    expiresAt: formData.get("expiresAt") || undefined,
    notes: formData.get("notes") || undefined,
    status: formData.get("status"),
    followUpsEnabled: parseFollowUpsEnabled(formData.get("followUpsEnabled")),
    sequenceId: formData.get("sequenceId") || undefined,
  });

  const pricing = parsePricingField(formData.get("pricing"));
  if (!parsed.success || "error" in pricing) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...("error" in pricing ? { pricing: [pricing.error] } : {}),
      },
    };
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
      pricing: pricing.pricing,
      jobType: String(formData.get("jobType") ?? "").slice(0, 80),
      assignedUserId:
        (await resolveAssignee(session.organization.id, formData.get("assignedUserId"))) ??
        session.user.id,
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

  // The quote is saved either way; the page reports whether the email went out.
  let sent: "1" | "failed" | null = null;
  if (formData.get("sendNow") === "on") {
    const result = await sendQuoteToCustomer({
      organizationId: session.organization.id,
      quoteId,
      userId: session.user.id,
    });
    sent = result.ok ? "1" : "failed";
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(sent ? `/quotes/${quoteId}?sent=${sent}` : `/quotes/${quoteId}`);
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
    jobDescription: formData.get("jobDescription"),
    quoteDate: formData.get("quoteDate"),
    expiresAt: formData.get("expiresAt") || undefined,
    notes: formData.get("notes") || undefined,
    followUpsEnabled: parseFollowUpsEnabled(formData.get("followUpsEnabled")),
  });

  const pricing = parsePricingField(formData.get("pricing"));
  if (!parsed.success || "error" in pricing) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...("error" in pricing ? { pricing: [pricing.error] } : {}),
      },
    };
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
  if (existing.acceptedAt) {
    return {
      error: "The customer has signed this quote, so it can't be changed. Duplicate it to make a new version.",
    };
  }

  const expiresAt = data.expiresAt
    ? parseDateInput(data.expiresAt, "end")
    : null;
  // Extending the expiration date reopens an expired quote.
  const reopened =
    existing.status === "expired" && expiresAt && expiresAt > new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({
        ...pricingColumns(pricing.pricing, pricing.amount),
        jobType: String(formData.get("jobType") ?? "").trim().slice(0, 80) || null,
        jobDescription: data.jobDescription,
        quoteDate: parseDateInput(data.quoteDate),
        expiresAt,
        notes: data.notes ?? null,
        followUpsEnabled: data.followUpsEnabled,
        status: reopened ? "pending" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, existing.id));
    await saveQuotePricing(tx, {
      organizationId: session.organization.id,
      quoteId: existing.id,
      pricing: pricing.pricing,
    });
  });

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
    metadata: JSON.stringify({
      followUpsEnabled: data.followUpsEnabled,
      options: pricing.pricing.options.length,
      amount: pricing.amount.toFixed(2),
    }),
  });

  revalidatePath(`/quotes/${existing.id}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes/${existing.id}`);
}

/** Copy a quote's job and pricing into a new draft and open it for editing. */
export async function duplicateQuoteAction(quoteId: string): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  const document = await loadQuoteDocument({ organizationId: session.organization.id, quoteId });
  if (!document) {
    return { error: "Quote not found." };
  }

  const { quote } = document;
  let copyId: string;
  try {
    const copy = await createQuoteFromInput({
      organizationId: session.organization.id,
      userId: session.user.id,
      customerId: quote.customerId,
      pricing: {
        options: document.options.map((option) => ({
          name: option.name,
          items: option.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
        })),
        discount: document.discount,
        taxRate: document.taxRate,
      },
      jobType: quote.jobType,
      assignedUserId: session.user.id,
      jobDescription: quote.jobDescription,
      quoteDate: new Date(),
      expiresAt: null,
      notes: quote.notes,
      status: "draft",
      followUpsEnabled: quote.followUpsEnabled,
      contactConfirmed: true,
      sequenceId: quote.sequenceId,
    });
    copyId = copy.id;
  } catch {
    return { error: "Could not duplicate this quote." };
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${copyId}/edit`);
}

export async function assignQuoteAction(
  quoteId: string,
  userId: string | null,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  const document = await loadQuoteDocument({ organizationId: session.organization.id, quoteId });
  if (!document) {
    return { error: "Quote not found." };
  }
  const assignee = userId ? await resolveAssignee(session.organization.id, userId) : null;
  if (userId && !assignee) {
    return { error: "That person isn't on your team." };
  }

  await db
    .update(quotes)
    .set({ assignedUserId: assignee, updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));
  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "quote",
    entityId: quoteId,
    action: "assigned",
    metadata: JSON.stringify({ to: assignee }),
  });

  if (assignee && assignee !== session.user.id && accountEmailsEnabled()) {
    const members = await listOrganizationMembers(session.organization.id);
    const member = members.find((item) => item.id === assignee);
    if (member?.emailVerifiedAt) {
      await sendAccountEmail(
        member.email,
        buildQuoteAssignedEmail({
          assignerName: session.user.name,
          quoteNumber: document.quote.quoteNumber,
          customerName: document.customer.name,
          total: formatMoney(document.quote.amount),
          url: appUrl(`/quotes/${quoteId}`),
        }),
      ).catch(() => undefined);
    }
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { success: true };
}
