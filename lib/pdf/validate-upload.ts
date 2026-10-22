export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type PdfValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validatePdfUpload(input: {
  mimeType: string;
  sizeBytes: number;
}) {
  if (input.mimeType !== "application/pdf") {
    return { ok: false, error: "Only PDF files are supported." };
  }

  if (input.sizeBytes <= 0) {
    return { ok: false, error: "The uploaded file is empty." };
  }

  if (input.sizeBytes > MAX_PDF_BYTES) {
    return { ok: false, error: "PDF must be 10 MB or smaller." };
  }

  return { ok: true };
}
