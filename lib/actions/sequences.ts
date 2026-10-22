"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  followUpSequences,
  followUpSteps,
  organizations,
} from "@/lib/db/schema";
import { createOrganizationSequence } from "@/lib/organization/clone-sequence";
import { rescheduleOpenQuotesForSequence } from "@/lib/follow-ups/schedule";
import {
  organizationEmailSettingsSchema,
  updateSequenceSchema,
} from "@/lib/validations/sequence";

export async function updateDefaultSequenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const rawSteps = formData.get("steps");
  if (typeof rawSteps !== "string") {
    return { error: "Invalid sequence data." };
  }

  let stepsJson: unknown;
  try {
    stepsJson = JSON.parse(rawSteps);
  } catch {
    return { error: "Invalid sequence data." };
  }

  const parsed = updateSequenceSchema.safeParse({
    sequenceId: formData.get("sequenceId"),
    steps: stepsJson,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { sequenceId, steps } = parsed.data;

  const [sequence] = await db
    .select()
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.id, sequenceId),
        eq(followUpSequences.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!sequence) {
    return { error: "Sequence not found." };
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const [existing] = await db
      .select({ id: followUpSteps.id })
      .from(followUpSteps)
      .where(
        and(
          eq(followUpSteps.id, step.id),
          eq(followUpSteps.sequenceId, sequenceId),
        ),
      )
      .limit(1);

    if (!existing) {
      return { error: "One or more steps could not be updated." };
    }

    await db
      .update(followUpSteps)
      .set({
        dayOffset: step.dayOffset,
        subject: step.subject,
        bodyTemplate: step.bodyTemplate,
        sortOrder: index + 1,
      })
      .where(eq(followUpSteps.id, step.id));
  }

  await rescheduleOpenQuotesForSequence(sequenceId);

  revalidatePath("/settings/sequences");
  revalidatePath("/dashboard");
  revalidatePath("/quotes");

  return {};
}

export async function updateOrganizationEmailSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = organizationEmailSettingsSchema.safeParse({
    businessPhone: formData.get("businessPhone") ?? "",
    emailSignature: formData.get("emailSignature") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(organizations)
    .set({
      businessPhone: parsed.data.businessPhone || null,
      emailSignature: parsed.data.emailSignature || null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.organization.id));

  revalidatePath("/settings/sequences");

  return {};
}

export async function createSequenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Sequence name is required." };
  }

  const cloneFrom = formData.get("cloneFromSequenceId");
  const cloneFromSequenceId =
    typeof cloneFrom === "string" && cloneFrom ? cloneFrom : undefined;

  await createOrganizationSequence(session.organization.id, name, {
    cloneFromSequenceId,
  });

  revalidatePath("/settings/sequences");
  return {};
}

export async function setDefaultSequenceAction(
  sequenceId: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const [sequence] = await db
    .select({ id: followUpSequences.id })
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.id, sequenceId),
        eq(followUpSequences.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!sequence) {
    return { error: "Sequence not found." };
  }

  await db
    .update(followUpSequences)
    .set({ isDefault: false })
    .where(eq(followUpSequences.organizationId, session.organization.id));

  await db
    .update(followUpSequences)
    .set({ isDefault: true })
    .where(eq(followUpSequences.id, sequenceId));

  revalidatePath("/settings/sequences");
  return {};
}
