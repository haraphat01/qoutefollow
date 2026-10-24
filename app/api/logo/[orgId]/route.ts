import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { readLogo } from "@/lib/quotes/branding";

/** Business logos are public: they appear in customer emails and quote pages. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) {
    return new Response("Not found", { status: 404 });
  }
  const [organization] = await db
    .select({ id: organizations.id, logoPath: organizations.logoPath })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  const data = organization ? await readLogo(organization) : null;
  if (!data) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": data[0] === 0x89 ? "image/png" : "image/jpeg",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
