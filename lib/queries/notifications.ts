import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function listRecentNotifications(
  organizationId: string,
  limit = 8,
) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.organizationId, organizationId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(organizationId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        isNull(notifications.readAt),
      ),
    );

  return row?.count ?? 0;
}
