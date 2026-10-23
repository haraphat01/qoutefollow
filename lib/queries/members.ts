import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";

export async function listOrganizationMembers(organizationId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));
}
