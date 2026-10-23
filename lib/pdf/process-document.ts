import { eq } from "drizzle-orm";

import {
  extractQuoteFieldsFromText,
  type ExtractedQuoteFields,
} from "@/lib/ai/extract-quote-fields";
import { db } from "@/lib/db";
import { organizations, quoteDocuments } from "@/lib/db/schema";
import { extractTextFromPdf, needsOcrFallback } from "@/lib/pdf/extract-text";
import { extractQuoteFieldsHeuristically } from "@/lib/pdf/heuristic-fields";
import { extractTextFromPdfWithOpenAi } from "@/lib/pdf/ocr-openai";
import { readOrganizationUpload } from "@/lib/storage/uploads";

export async function processQuoteDocument(documentId: string) {
  const [document] = await db
    .select()
    .from(quoteDocuments)
    .where(eq(quoteDocuments.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error("Document not found");
  }

  const buffer = await readOrganizationUpload(document.storagePath);

  let extractionMethod = "pdf_text";
  let extractedText = "";

  try {
    extractedText = await extractTextFromPdf(buffer);
    if (needsOcrFallback(extractedText)) {
      extractionMethod = "openai_ocr";
      extractedText = await extractTextFromPdfWithOpenAi(buffer, document.fileName);
    }

    let fields: ExtractedQuoteFields;
    try {
      fields = await extractQuoteFieldsFromText(extractedText);
    } catch (aiError) {
      if (!extractedText.trim()) {
        throw aiError;
      }
      // AI is optional for text PDFs: fall back to pattern matching.
      const [org] = await db
        .select({ replyEmail: organizations.replyEmail })
        .from(organizations)
        .where(eq(organizations.id, document.organizationId))
        .limit(1);
      fields = extractQuoteFieldsHeuristically(extractedText, {
        excludeEmails: org?.replyEmail ? [org.replyEmail] : [],
      });
      extractionMethod = `${extractionMethod}+patterns`;
    }

    await db
      .update(quoteDocuments)
      .set({
        extractedText,
        extractionMethod,
        extractedPayload: JSON.stringify(fields),
        extractionStatus: "ready",
        extractionError: null,
      })
      .where(eq(quoteDocuments.id, documentId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";

    await db
      .update(quoteDocuments)
      .set({
        extractedText: extractedText || null,
        extractionMethod,
        extractionStatus: "ready",
        extractionError: message,
        extractedPayload: JSON.stringify({
          customerName: null,
          customerEmail: null,
          estimateNumber: null,
          amount: null,
          jobDescription: null,
          quoteDate: null,
          expirationDate: null,
          notes: null,
          confidence: "low",
        }),
      })
      .where(eq(quoteDocuments.id, documentId));
  }
}
