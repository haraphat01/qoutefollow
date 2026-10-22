import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

export async function getOrganizationEmailSettings(organizationId: string) {
  const [org] = await db
    .select({
      businessPhone: organizations.businessPhone,
      emailSignature: organizations.emailSignature,
      mailingAddress: organizations.mailingAddress,
      sendTimezone: organizations.sendTimezone,
      replyEmail: organizations.replyEmail,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org ?? null;
}
