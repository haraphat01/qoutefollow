"use server";

import { and, eq, ne } from "drizzle-orm";
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

  const [duplicate] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, session.organization.id),
        eq(customers.email, parsed.data.email.toLowerCase()),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { email: ["A customer with this email already exists."] } };
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

export async function updateCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const customerId = formData.get("customerId");
  if (typeof customerId !== "string" || !customerId) {
    return { error: "Customer not found." };
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

  const email = parsed.data.email.toLowerCase();
  const [duplicate] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, session.organization.id),
        eq(customers.email, email),
        ne(customers.id, customerId),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { email: ["Another customer already uses this email."] } };
  }

  const [updated] = await db
    .update(customers)
    .set({
      name: parsed.data.name,
      email,
      phone: parsed.data.phone ?? null,
      notes: parsed.data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, session.organization.id),
      ),
    )
    .returning({ id: customers.id });

  if (!updated) {
    return { error: "Customer not found." };
  }

  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "customer",
    entityId: customerId,
    action: "updated",
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/quotes");
  return { success: true };
}
