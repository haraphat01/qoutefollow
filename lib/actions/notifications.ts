"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function markNotificationsReadAction() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return;
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.organizationId, session.organization.id),
        isNull(notifications.readAt),
      ),
    );

  revalidatePath("/dashboard");
}
