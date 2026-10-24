/**
 * Who runs QuoteFollow, for the Terms and Privacy Policy. Set these in the
 * environment (they are read at build time) rather than editing the pages.
 */
export const LEGAL = {
  operator: process.env.LEGAL_OPERATOR_NAME?.trim() || "Pencil Digital Services",
  contactEmail:
    process.env.LEGAL_CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAILS?.split(",")[0]?.trim() ||
    "",
  /** e.g. "the State of Texas, USA" or "the Federal Republic of Nigeria". */
  jurisdiction: process.env.LEGAL_JURISDICTION?.trim() || "",
  lastUpdated: "October 24, 2026",
};
