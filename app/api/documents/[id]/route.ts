import { getSession } from "@/lib/auth/session";
import { getQuoteDocument } from "@/lib/queries/documents";
import { readOrganizationUpload } from "@/lib/storage/uploads";

/** Streams an uploaded estimate PDF to members of the owning organization only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const document = await getQuoteDocument(session.organization.id, id);
  if (!document) {
    return new Response("Not found", { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readOrganizationUpload(document.storagePath);
  } catch {
    return new Response("File is no longer available", { status: 404 });
  }

  const safeName = document.fileName.replace(/["\\\r\n]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${safeName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
