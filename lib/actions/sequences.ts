"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  followUpSequences,
  followUpSteps,
  organizations,
  quotes,
} from "@/lib/db/schema";
import { createOrganizationSequence } from "@/lib/organization/clone-sequence";
import {
  assignQuoteSequence,
  rescheduleOpenQuotesForSequence,
} from "@/lib/follow-ups/schedule";
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
    name: formData.get("name"),
    steps: stepsJson,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { sequenceId, name, steps } = parsed.data;

  const [sequence] = await db
    .select()
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.id, sequenceId),
        eq(followUpSequences.organizationId, session.organization.id),
        isNull(followUpSequences.archivedAt),
      ),
    )
    .limit(1);

  if (!sequence) {
    return { error: "Sequence not found." };
  }

  const currentSteps = await db
    .select({ id: followUpSteps.id })
    .from(followUpSteps)
    .where(
      and(
        eq(followUpSteps.sequenceId, sequenceId),
        isNull(followUpSteps.archivedAt),
      ),
    );
  const currentIds = new Set(currentSteps.map((step) => step.id));

  if (steps.some((step) => step.id && !currentIds.has(step.id))) {
    return { error: "One or more steps could not be updated." };
  }

  // Send order follows the day offset, whatever order steps were edited in.
  const ordered = [...steps].sort((a, b) => a.dayOffset - b.dayOffset);
  const keptIds = new Set(ordered.flatMap((step) => (step.id ? [step.id] : [])));
  const removedIds = [...currentIds].filter((id) => !keptIds.has(id));

  if (removedIds.length > 0) {
    await db
      .update(followUpSteps)
      .set({ archivedAt: new Date() })
      .where(inArray(followUpSteps.id, removedIds));
  }

  for (let index = 0; index < ordered.length; index += 1) {
    const step = ordered[index];
    const values = {
      dayOffset: step.dayOffset,
      subject: step.subject,
      bodyTemplate: step.bodyTemplate,
      sortOrder: index + 1,
    };

    if (step.id) {
      await db
        .update(followUpSteps)
        .set(values)
        .where(eq(followUpSteps.id, step.id));
    } else {
      await db.insert(followUpSteps).values({ sequenceId, ...values });
    }
  }

  if (name !== sequence.name) {
    await db
      .update(followUpSequences)
      .set({ name })
      .where(eq(followUpSequences.id, sequenceId));
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

  if (session.role !== "owner") {
    return { error: "Only the account owner can change email settings." };
  }

  const parsed = organizationEmailSettingsSchema.safeParse({
    businessName: formData.get("businessName") ?? "",
    replyEmail: formData.get("replyEmail") ?? "",
    businessPhone: formData.get("businessPhone") ?? "",
    emailSignature: formData.get("emailSignature") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(organizations)
    .set({
      name: parsed.data.businessName,
      replyEmail: parsed.data.replyEmail.toLowerCase(),
      businessPhone: parsed.data.businessPhone || null,
      emailSignature: parsed.data.emailSignature || null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.organization.id));

  revalidatePath("/", "layout");

  return {};
}

export async function createSequenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { sequenceId?: string }> {
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

  const sequence = await createOrganizationSequence(
    session.organization.id,
    name,
    { cloneFromSequenceId },
  );

  revalidatePath("/settings/sequences");
  return { sequenceId: sequence.id };
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
        isNull(followUpSequences.archivedAt),
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

/** Archive a non-default sequence and move its quotes to the default sequence. */
export async function deleteSequenceAction(
  sequenceId: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const orgSequences = await db
    .select()
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.organizationId, session.organization.id),
        isNull(followUpSequences.archivedAt),
      ),
    );

  const sequence = orgSequences.find((row) => row.id === sequenceId);
  if (!sequence) {
    return { error: "Sequence not found." };
  }
  if (sequence.isDefault) {
    return { error: "Choose another default sequence before deleting this one." };
  }

  const fallback = orgSequences.find((row) => row.isDefault);
  if (!fallback) {
    return { error: "Set a default sequence first." };
  }

  await db
    .update(followUpSequences)
    .set({ archivedAt: new Date(), isDefault: false })
    .where(eq(followUpSequences.id, sequenceId));

  const affected = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, session.organization.id),
        eq(quotes.sequenceId, sequenceId),
      ),
    );

  for (const quote of affected) {
    await assignQuoteSequence(quote.id, fallback.id, session.organization.id);
  }

  revalidatePath("/settings/sequences");
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return {};
}
