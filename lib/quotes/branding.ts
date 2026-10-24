import { appUrl } from "@/lib/billing/stripe";
import type { organizations } from "@/lib/db/schema";
import { readOrganizationUpload } from "@/lib/storage/uploads";

type Org = Pick<typeof organizations.$inferSelect, "id" | "logoPath">;

/** Public logo URL for emails and the online quote; changes when the logo does. */
export function logoUrl(organization: Org) {
  if (!organization.logoPath) {
    return null;
  }
  const version = organization.logoPath.split("/").pop()?.replace(/\.[a-z]+$/, "") ?? "1";
  return appUrl(`/api/logo/${organization.id}?v=${encodeURIComponent(version)}`);
}

export async function readLogo(organization: Org) {
  if (!organization.logoPath) {
    return null;
  }
  try {
    return await readOrganizationUpload(organization.logoPath);
  } catch {
    return null;
  }
}

export function publicQuoteUrl(publicToken: string) {
  return appUrl(`/q/${publicToken}`);
}

export function quotePdfFileName(quoteNumber: string, businessName: string) {
  return `${businessName} estimate ${quoteNumber}.pdf`.replace(/[^\w .-]+/g, "").replace(/\s+/g, " ").trim();
}
