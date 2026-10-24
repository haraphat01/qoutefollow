"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { emailSuppressions, organizations } from "@/lib/db/schema";
import { accountEmailsEnabled } from "@/lib/email/account-emails";
import { sendWeeklySummary } from "@/lib/reports/weekly-summary";
import {
  mailingComplianceSchema,
  sendTimezoneSchema,
} from "@/lib/validations/deliverability";

function requireOwner(role: string) {
  if (role !== "owner") {
    return "Only the account owner can change deliverability settings.";
  }
  return null;
}

export async function updateMailingComplianceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const ownerError = requireOwner(session.role);
  if (ownerError) {
    return { error: ownerError };
  }

  const parsed = mailingComplianceSchema.safeParse({
    mailingAddress: formData.get("mailingAddress") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(organizations)
    .set({
      mailingAddress: parsed.data.mailingAddress,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.organization.id));

  revalidatePath("/settings/email");
  return {};
}

export async function updateSendTimezoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const ownerError = requireOwner(session.role);
  if (ownerError) {
    return { error: ownerError };
  }

  const parsed = sendTimezoneSchema.safeParse({
    sendTimezone: formData.get("sendTimezone") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(organizations)
    .set({
      sendTimezone: parsed.data.sendTimezone,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.organization.id));

  revalidatePath("/settings/email");
  revalidatePath("/dashboard");
  return {};
}

export async function removeEmailSuppressionAction(
  suppressionId: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const ownerError = requireOwner(session.role);
  if (ownerError) {
    return { error: ownerError };
  }

  await db
    .delete(emailSuppressions)
    .where(
      and(
        eq(emailSuppressions.id, suppressionId),
        eq(emailSuppressions.organizationId, session.organization.id),
      ),
    );

  revalidatePath("/settings/email");
  return {};
}

export async function updateWeeklySummaryAction(enabled: boolean): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  const ownerError = requireOwner(session.role);
  if (ownerError) {
    return { error: ownerError };
  }
  await db
    .update(organizations)
    .set({ weeklySummaryEnabled: enabled, updatedAt: new Date() })
    .where(eq(organizations.id, session.organization.id));
  revalidatePath("/settings/email");
  return { success: true };
}

export async function sendWeeklySummaryPreviewAction(): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (!accountEmailsEnabled()) {
    return { error: "Email sending isn't set up yet (RESEND_API_KEY is missing)." };
  }
  const sent = await sendWeeklySummary(session.organization.id, { to: session.user.email });
  return sent > 0 ? { success: true } : { error: "The preview couldn't be sent. Try again shortly." };
}
