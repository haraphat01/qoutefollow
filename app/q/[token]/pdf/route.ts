import { quotePdfResponse } from "@/lib/quotes/pdf-response";
import { loadQuoteDocument } from "@/lib/quotes/quote-document";

/** The quote as a PDF, for whoever holds the customer's link. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const document = /^[\w-]{20,64}$/.test(token) ? await loadQuoteDocument({ publicToken: token }) : null;
  if (!document) {
    return new Response("Not found", { status: 404 });
  }
  return quotePdfResponse(document, "private, no-store");
}
