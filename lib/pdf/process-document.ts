import { eq } from "drizzle-orm";

import { extractQuoteFieldsFromText } from "@/lib/ai/extract-quote-fields";
import { db } from "@/lib/db";
import { quoteDocuments } from "@/lib/db/schema";
import { extractTextFromPdf, needsOcrFallback } from "@/lib/pdf/extract-text";
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

    const fields = await extractQuoteFieldsFromText(extractedText);

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
