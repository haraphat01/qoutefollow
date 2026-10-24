import { getSession } from "@/lib/auth/session";
import { quotePdfResponse } from "@/lib/quotes/pdf-response";
import { loadQuoteDocument } from "@/lib/quotes/quote-document";

/** The quote as a PDF, for members of its workspace. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const document = /^[0-9a-f-]{36}$/i.test(id)
    ? await loadQuoteDocument({ organizationId: session.organization.id, quoteId: id })
    : null;
  if (!document) {
    return new Response("Not found", { status: 404 });
  }
  return quotePdfResponse(document, "private, no-store");
}
