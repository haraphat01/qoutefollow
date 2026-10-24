import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

/** A form's "assigned to" value, if it names a member of this workspace. */
export async function resolveAssignee(
  organizationId: string,
  value: FormDataEntryValue | string | null,
) {
  const userId = typeof value === "string" ? value.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return null;
  }
  const [member] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return member?.userId ?? null;
}
