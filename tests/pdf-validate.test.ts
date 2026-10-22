import { describe, expect, it } from "vitest";

import { validatePdfUpload, MAX_PDF_BYTES } from "@/lib/pdf/validate-upload";

describe("validatePdfUpload", () => {
  it("rejects non-pdf files", () => {
    const result = validatePdfUpload({
      mimeType: "image/png",
      sizeBytes: 1000,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects oversized files", () => {
    const result = validatePdfUpload({
      mimeType: "application/pdf",
      sizeBytes: MAX_PDF_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid pdf uploads", () => {
    const result = validatePdfUpload({
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(true);
  });
});
