import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { followUpSequences, followUpSteps } from "@/lib/db/schema";

export async function listOrganizationSequences(organizationId: string) {
  return db
    .select()
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.organizationId, organizationId),
        isNull(followUpSequences.archivedAt),
      ),
    )
    .orderBy(desc(followUpSequences.isDefault), followUpSequences.name);
}

export async function getDefaultSequence(organizationId: string) {
  const [sequence] = await db
    .select()
    .from(followUpSequences)
    .where(
      and(
        eq(followUpSequences.organizationId, organizationId),
        eq(followUpSequences.isDefault, true),
      ),
    )
    .limit(1);

  if (!sequence) {
    return null;
  }

  return getSequenceWithSteps(organizationId, sequence.id);
}

export async function getSequenceWithSteps(
  organizationId: string,
  sequenceId: string,
) {
  const [sequence] = await db
    .select()
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
    return null;
  }

  const steps = await db
    .select()
    .from(followUpSteps)
    .where(
      and(
        eq(followUpSteps.sequenceId, sequence.id),
        isNull(followUpSteps.archivedAt),
      ),
    )
    .orderBy(asc(followUpSteps.sortOrder));

  return { sequence, steps };
}
