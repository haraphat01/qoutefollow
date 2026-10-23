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
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  markEmailVerified,
} from "@/lib/auth/account-flows";
import {
  createSession,
  destroyAllSessionsForUser,
  emailVerificationRequired,
  getSession,
} from "@/lib/auth/session";
import {
  consumeAuthToken,
  findAuthToken,
  issuedRecently,
} from "@/lib/auth/tokens";
import { createDefaultFollowUpSequence } from "@/lib/organization/defaults";
import { uniqueSlug } from "@/lib/utils/slug";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

const NO_WORKSPACE_ERROR =
  "This account is no longer part of a workspace. Ask the owner to invite you again.";

/** Removed teammates keep their login but have no workspace to open. */
async function createSessionIfMember(userId: string) {
  try {
    await createSession(userId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ORGANIZATION") {
      return false;
    }
    throw error;
  }
}

export type ActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
  /** Echoed non-secret inputs, since React resets forms after an action. */
  values?: Record<string, string>;
};

function echo(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}

const REGISTER_FIELDS = ["name", "email", "businessName", "trade"];

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
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: echo(formData, REGISTER_FIELDS),
    };
  }

  const data = parsed.data;
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    return {
      error: "An account with this email already exists.",
      values: echo(formData, REGISTER_FIELDS),
    };
  }

  const passwordHash = await hashPassword(data.password);
  const suffix = randomBytes(3).toString("hex");

  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      emailVerifiedAt: emailVerificationRequired() ? null : new Date(),
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

  if (emailVerificationRequired()) {
    try {
      await sendVerificationEmail(user);
    } catch {
      // The verify page lets them request another link.
    }
    redirect("/verify-email");
  }

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
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: echo(formData, ["email"]),
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  if (!user) {
    return {
      error: "Invalid email or password.",
      values: echo(formData, ["email"]),
    };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return {
      error: "Invalid email or password.",
      values: echo(formData, ["email"]),
    };
  }

  if (!(await createSessionIfMember(user.id))) {
    return { error: NO_WORKSPACE_ERROR, values: echo(formData, ["email"]) };
  }

  // The form may be submitted before hydration adds the hidden `next` field.
  let next = formData.get("next");
  if (!next) {
    const referer = (await headers()).get("referer");
    next = referer ? new URL(referer).searchParams.get("next") : null;
  }
  redirect(safeNextPath(next));
}

export async function resendVerificationEmailAction(): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sign in again to resend the link." };
  }
  if (session.user.emailVerified) {
    return { success: true };
  }
  if (await issuedRecently(session.user.id, "email_verification")) {
    return { error: "We just sent a link. Wait a minute before asking again." };
  }

  try {
    await sendVerificationEmail(session.user);
  } catch {
    return { error: "We couldn't send the email. Try again shortly." };
  }
  return { success: true };
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: echo(formData, ["email"]),
    };
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  // Same response whether or not the account exists, so emails can't be probed.
  if (user && !(await issuedRecently(user.id, "password_reset"))) {
    try {
      await sendPasswordResetEmail(user);
    } catch {
      return {
        error: "We couldn't send the email. Try again shortly.",
        values: echo(formData, ["email"]),
      };
    }
  }
  return { success: true };
}

/** Sets a new password from a reset link or a teammate invite link. */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const token = await findAuthToken(parsed.data.token, [
    "password_reset",
    "team_invite",
  ]);
  if (!token || !(await consumeAuthToken(token.id))) {
    return {
      error: "This link is invalid or has expired. Request a new one.",
    };
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.password),
      updatedAt: new Date(),
    })
    .where(eq(users.id, token.userId));

  // Opening the emailed link proves they own the address.
  await markEmailVerified(token.userId);
  await destroyAllSessionsForUser(token.userId);
  if (!(await createSessionIfMember(token.userId))) {
    return { error: NO_WORKSPACE_ERROR };
  }
  redirect("/dashboard");
}
