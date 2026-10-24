"use server";

import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizations, priceBookItems, quoteTemplates } from "@/lib/db/schema";
import { MAX_TAX_RATE } from "@/lib/quotes/pricing";
import { loadQuoteDocument, toPricingDraft } from "@/lib/quotes/quote-document";
import { saveOrganizationUpload } from "@/lib/storage/uploads";

const MAX_LOGO_BYTES = 1024 * 1024;

const priceBookSchema = z.object({
  name: z.string().trim().min(1, "Name the item").max(300),
  unitPrice: z.coerce.number().min(0, "Price can't be negative").max(100_000_000),
});

async function memberSession() {
  return requireSession().catch(() => null);
}

export async function savePriceBookItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  const parsed = priceBookSchema.safeParse({
    name: formData.get("name"),
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const id = String(formData.get("id") ?? "");
  if (id) {
    await db
      .update(priceBookItems)
      .set({ name: parsed.data.name, unitPrice: parsed.data.unitPrice.toFixed(2), updatedAt: new Date() })
      .where(and(eq(priceBookItems.id, id), eq(priceBookItems.organizationId, session.organization.id)));
  } else {
    await db.insert(priceBookItems).values({
      organizationId: session.organization.id,
      name: parsed.data.name,
      unitPrice: parsed.data.unitPrice.toFixed(2),
    });
  }
  revalidatePath("/settings/quoting");
  return { success: true };
}

export async function deletePriceBookItemAction(id: string): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  await db
    .delete(priceBookItems)
    .where(and(eq(priceBookItems.id, id), eq(priceBookItems.organizationId, session.organization.id)));
  revalidatePath("/settings/quoting");
  return { success: true };
}

export async function saveQuoteAsTemplateAction(
  quoteId: string,
  name: string,
): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) {
    return { error: "Name the template." };
  }
  const document = await loadQuoteDocument({ organizationId: session.organization.id, quoteId });
  if (!document) {
    return { error: "Quote not found." };
  }

  await db.insert(quoteTemplates).values({
    organizationId: session.organization.id,
    name: trimmed,
    jobDescription: document.quote.jobDescription,
    jobType: document.quote.jobType,
    pricing: JSON.stringify(toPricingDraft(document)),
  });
  revalidatePath("/settings/quoting");
  revalidatePath("/quotes/new");
  return { success: true };
}

export async function deleteQuoteTemplateAction(id: string): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  await db
    .delete(quoteTemplates)
    .where(and(eq(quoteTemplates.id, id), eq(quoteTemplates.organizationId, session.organization.id)));
  revalidatePath("/settings/quoting");
  revalidatePath("/quotes/new");
  return { success: true };
}

export async function updateQuotingDefaultsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "owner") {
    return { error: "Only the account owner can change quote defaults." };
  }
  const rate = z.coerce.number().min(0).max(MAX_TAX_RATE).safeParse(formData.get("defaultTaxRate"));
  if (!rate.success) {
    return { fieldErrors: { defaultTaxRate: [`Use a rate between 0 and ${MAX_TAX_RATE}%.`] } };
  }
  await db
    .update(organizations)
    .set({ defaultTaxRate: rate.data.toFixed(3), updatedAt: new Date() })
    .where(eq(organizations.id, session.organization.id));
  revalidatePath("/settings/quoting");
  return { success: true };
}

/** Checks the file really is a PNG or JPEG rather than trusting its type. */
function imageKind(data: Buffer): "png" | "jpeg" | null {
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "jpeg";
  }
  return null;
}

export async function uploadLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "owner") {
    return { error: "Only the account owner can change the logo." };
  }
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PNG or JPEG image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Use an image under 1 MB." };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const kind = imageKind(data);
  if (!kind) {
    return { error: "Use a PNG or JPEG image." };
  }

  const fileName = `logo-${randomBytes(6).toString("hex")}.${kind === "png" ? "png" : "jpg"}`;
  const storagePath = await saveOrganizationUpload(
    session.organization.id,
    fileName,
    data,
    kind === "png" ? "image/png" : "image/jpeg",
  );
  await db
    .update(organizations)
    .set({ logoPath: storagePath, updatedAt: new Date() })
    .where(eq(organizations.id, session.organization.id));
  revalidatePath("/settings/quoting");
  return { success: true };
}

export async function removeLogoAction(): Promise<ActionState> {
  const session = await memberSession();
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "owner") {
    return { error: "Only the account owner can change the logo." };
  }
  await db
    .update(organizations)
    .set({ logoPath: null, updatedAt: new Date() })
    .where(eq(organizations.id, session.organization.id));
  revalidatePath("/settings/quoting");
  return { success: true };
}
