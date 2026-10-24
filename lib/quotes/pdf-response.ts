import { buildQuotePdf } from "@/lib/quotes/quote-pdf";
import type { QuoteDocument } from "@/lib/quotes/quote-document";
import { publicQuoteUrl, quotePdfFileName, readLogo } from "@/lib/quotes/branding";

export async function quotePdfBytes(document: QuoteDocument) {
  const open = ["draft", "pending", "paused"].includes(document.quote.status);
  return buildQuotePdf(document, {
    logo: await readLogo(document.organization),
    acceptUrl: open && document.quote.publicToken ? publicQuoteUrl(document.quote.publicToken) : null,
  });
}

export async function quotePdfResponse(document: QuoteDocument, cacheControl: string) {
  const bytes = await quotePdfBytes(document);
  const fileName = quotePdfFileName(document.quote.quoteNumber, document.organization.name);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${fileName}"`,
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
    },
  });
}
