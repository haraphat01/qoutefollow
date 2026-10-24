import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations, priceBookItems, quoteTemplates, quotes } from "@/lib/db/schema";
import type { PricingDraft } from "@/lib/quotes/pricing";

export async function listPriceBook(organizationId: string) {
  const rows = await db
    .select()
    .from(priceBookItems)
    .where(eq(priceBookItems.organizationId, organizationId))
    .orderBy(asc(priceBookItems.name));
  return rows.map((row) => ({ id: row.id, name: row.name, unitPrice: Number(row.unitPrice) }));
}

export async function listQuoteTemplates(organizationId: string) {
  const rows = await db
    .select()
    .from(quoteTemplates)
    .where(eq(quoteTemplates.organizationId, organizationId))
    .orderBy(asc(quoteTemplates.name));
  return rows.map((row) => {
    let pricing: PricingDraft | null = null;
    try {
      pricing = JSON.parse(row.pricing) as PricingDraft;
    } catch {
      pricing = null;
    }
    return {
      id: row.id,
      name: row.name,
      jobDescription: row.jobDescription,
      jobType: row.jobType,
      pricing,
      createdAt: row.createdAt,
    };
  });
}

/** Job types used before, most common first, to suggest in the form. */
export async function listJobTypes(organizationId: string) {
  const rows = await db
    .select({ jobType: quotes.jobType, uses: sql<number>`count(*)::int` })
    .from(quotes)
    .where(and(eq(quotes.organizationId, organizationId), isNotNull(quotes.jobType)))
    .groupBy(quotes.jobType)
    .orderBy(desc(sql`count(*)`))
    .limit(30);
  return rows.map((row) => row.jobType!).filter(Boolean);
}

export async function getQuotingSettings(organizationId: string) {
  const [row] = await db
    .select({
      logoPath: organizations.logoPath,
      defaultTaxRate: organizations.defaultTaxRate,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return {
    hasLogo: Boolean(row?.logoPath),
    defaultTaxRate: Number(row?.defaultTaxRate ?? 0),
    logoVersion: row?.updatedAt?.getTime() ?? 0,
  };
}
