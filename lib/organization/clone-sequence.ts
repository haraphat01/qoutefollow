import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { followUpSequences, followUpSteps } from "@/lib/db/schema";
import { DEFAULT_FOLLOW_UP_STEPS } from "@/lib/organization/defaults";

export async function cloneStepsFromSequence(sourceSequenceId: string) {
  const steps = await db
    .select()
    .from(followUpSteps)
    .where(eq(followUpSteps.sequenceId, sourceSequenceId))
    .orderBy(followUpSteps.sortOrder);

  if (steps.length === 0) {
    return DEFAULT_FOLLOW_UP_STEPS.map((step) => ({ ...step }));
  }

  return steps.map((step) => ({
    dayOffset: step.dayOffset,
    sortOrder: step.sortOrder,
    subject: step.subject,
    bodyTemplate: step.bodyTemplate,
  }));
}

export async function createOrganizationSequence(
  organizationId: string,
  name: string,
  options?: { isDefault?: boolean; cloneFromSequenceId?: string },
) {
  if (options?.isDefault) {
    await db
      .update(followUpSequences)
      .set({ isDefault: false })
      .where(eq(followUpSequences.organizationId, organizationId));
  }

  const [defaultSequence] = await db
    .select({ id: followUpSequences.id })
    .from(followUpSequences)
    .where(eq(followUpSequences.organizationId, organizationId))
    .limit(1);

  const templateSteps = options?.cloneFromSequenceId
    ? await cloneStepsFromSequence(options.cloneFromSequenceId)
    : defaultSequence
      ? await cloneStepsFromSequence(defaultSequence.id)
      : DEFAULT_FOLLOW_UP_STEPS.map((step) => ({ ...step }));

  const [sequence] = await db
    .insert(followUpSequences)
    .values({
      organizationId,
      name,
      isDefault: options?.isDefault ?? false,
    })
    .returning();

  await db.insert(followUpSteps).values(
    templateSteps.map((step) => ({
      sequenceId: sequence.id,
      dayOffset: step.dayOffset,
      sortOrder: step.sortOrder,
      subject: step.subject,
      bodyTemplate: step.bodyTemplate,
    })),
  );

  return sequence;
}
