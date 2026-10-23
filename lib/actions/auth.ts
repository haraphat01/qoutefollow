"use server";

import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createDefaultFollowUpSequence } from "@/lib/organization/defaults";
import { uniqueSlug } from "@/lib/utils/slug";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export type ActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    businessName: formData.get("businessName"),
    trade: formData.get("trade"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(data.password);
  const suffix = randomBytes(3).toString("hex");

  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
    })
    .returning();

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const [organization] = await db
    .insert(organizations)
    .values({
      name: data.businessName,
      trade: data.trade,
      slug: uniqueSlug(data.businessName, suffix),
      replyEmail: data.email.toLowerCase(),
      subscriptionPlan: "starter",
      subscriptionStatus: "trialing",
      trialEndsAt,
    })
    .returning();

  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId: user.id,
    role: "owner",
  });

  await createDefaultFollowUpSequence(organization.id);
  await createSession(user.id);
  redirect("/dashboard");
}

/** Only allow same-site relative paths so `?next=` can't redirect off-site. */
function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  if (!user) {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);

  // The form may be submitted before hydration adds the hidden `next` field.
  let next = formData.get("next");
  if (!next) {
    const referer = (await headers()).get("referer");
    next = referer ? new URL(referer).searchParams.get("next") : null;
  }
  redirect(safeNextPath(next));
}
