"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assertEntitlement,
  getOrganizationEntitlements,
} from "@/lib/billing/organization";
import { requireSession } from "@/lib/auth/session";
import { validatePdfUpload } from "@/lib/pdf/validate-upload";
import { db } from "@/lib/db";
import { quoteDocuments } from "@/lib/db/schema";
import { processQuoteDocument } from "@/lib/pdf/process-document";
import { createQuoteFromInput } from "@/lib/quotes/create-quote";
import { parsePricingField } from "@/lib/quotes/pricing";
import { saveOrganizationUpload } from "@/lib/storage/uploads";
import { confirmImportedQuoteSchema } from "@/lib/validations/quote-import";

import { parseDateInput } from "@/lib/format";

import type { ActionState } from "./auth";

function parseFollowUpsEnabled(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export async function uploadPdfAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const billing = await getOrganizationEntitlements(session.organization.id);
  if (!billing) {
    return { error: "Organization not found." };
  }

  try {
    assertEntitlement(billing.entitlements, "canImportPdf");
  } catch {
    return {
      error: "PDF import requires an active subscription or trial.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a PDF file to upload." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validatePdfUpload({
    mimeType: file.type,
    sizeBytes: buffer.length,
  });
  if (!validation.ok) {
    return { error: validation.error };
  }

  const storedName = `${randomUUID()}.pdf`;
  const storagePath = await saveOrganizationUpload(
    session.organization.id,
    storedName,
    buffer,
  );

  const [document] = await db
    .insert(quoteDocuments)
    .values({
      organizationId: session.organization.id,
      fileName: file.name,
      storagePath,
      mimeType: file.type,
      extractionStatus: "processing",
    })
    .returning();

  await processQuoteDocument(document.id);

  redirect(`/quotes/import/${document.id}`);
}

export async function confirmImportedQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = confirmImportedQuoteSchema.safeParse({
    documentId: formData.get("documentId"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    estimateNumber: formData.get("estimateNumber") || undefined,
    jobDescription: formData.get("jobDescription"),
    quoteDate: formData.get("quoteDate"),
    expiresAt: formData.get("expiresAt") || undefined,
    notes: formData.get("notes") || undefined,
    status: formData.get("status"),
    followUpsEnabled: parseFollowUpsEnabled(formData.get("followUpsEnabled")),
    contactConfirmed: formData.get("contactConfirmed") === "on",
  });

  const pricing = parsePricingField(formData.get("pricing"));
  if (!parsed.success || "error" in pricing) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...("error" in pricing ? { pricing: [pricing.error] } : {}),
      },
    };
  }

  const data = parsed.data;

  const [document] = await db
    .select()
    .from(quoteDocuments)
    .where(
      and(
        eq(quoteDocuments.id, data.documentId),
        eq(quoteDocuments.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!document) {
    return { error: "Import session not found." };
  }

  if (document.quoteId) {
    redirect(`/quotes/${document.quoteId}`);
  }

  let quoteId: string;
  try {
    const quote = await createQuoteFromInput({
      organizationId: session.organization.id,
      userId: session.user.id,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      pricing: pricing.pricing,
      jobDescription: data.jobDescription,
      quoteDate: parseDateInput(data.quoteDate),
      expiresAt: data.expiresAt ? parseDateInput(data.expiresAt, "end") : null,
      notes: data.notes,
      status: data.status,
      followUpsEnabled: data.followUpsEnabled ?? true,
      contactConfirmed: true,
      quoteNumberOverride: data.estimateNumber,
      documentId: document.id,
    });
    quoteId = quote.id;
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_REQUIRED") {
      return { error: "Customer name and email are required." };
    }
    return { error: "Could not save quote. Try again." };
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(`/quotes/${quoteId}`);
}
