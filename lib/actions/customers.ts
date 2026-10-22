"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activityLogs, customers } from "@/lib/db/schema";
import { customerSchema } from "@/lib/validations/customer";

import type { ActionState } from "./auth";

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [customer] = await db
    .insert(customers)
    .values({
      organizationId: session.organization.id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      notes: parsed.data.notes,
    })
    .returning();

  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "customer",
    entityId: customer.id,
    action: "created",
  });

  revalidatePath("/customers");
  redirect("/customers");
}
