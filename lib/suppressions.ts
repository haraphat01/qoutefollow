import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailSuppressions } from "@/lib/db/schema";

export async function isEmailSuppressed(
  organizationId: string,
  email: string,
) {
  const normalized = email.toLowerCase();
  const [row] = await db
    .select({ id: emailSuppressions.id })
    .from(emailSuppressions)
    .where(
      and(
        eq(emailSuppressions.organizationId, organizationId),
        eq(emailSuppressions.email, normalized),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function suppressEmail(input: {
  organizationId: string;
  email: string;
  reason: string;
  sourceQuoteId?: string | null;
}) {
  const normalized = input.email.toLowerCase();
  const existing = await isEmailSuppressed(input.organizationId, normalized);
  if (existing) {
    return;
  }

  await db.insert(emailSuppressions).values({
    organizationId: input.organizationId,
    email: normalized,
    reason: input.reason,
    sourceQuoteId: input.sourceQuoteId ?? null,
  });
}
