import { PLAN_CATALOG, TRIAL_DAYS } from "@/lib/billing/plans";

export const SITE_NAME = "QuoteFollow";

export const SITE_TITLE =
  "QuoteFollow — Quote Follow-Up Software for Roofing, HVAC & Plumbing Contractors";

export const SITE_DESCRIPTION =
  "QuoteFollow sends automatic, polite email follow-ups on your roofing, HVAC, and plumbing estimates, pauses the moment a customer replies, and shows which quotes turn into booked jobs.";

/** Public origin, used for canonical URLs, the sitemap and structured data. */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://qoutefollow.com").replace(/\/+$/, "");
}

/** Signed-in app areas and one-off links: never worth indexing. */
export const PRIVATE_PATHS = [
  "/dashboard",
  "/quotes",
  "/customers",
  "/settings",
  "/reports",
  "/admin",
  "/api/",
  "/verify-email",
  "/reset-password",
  "/forgot-password",
];

export const FAQ = [
  {
    question: "What is QuoteFollow?",
    answer:
      "QuoteFollow is quote follow-up software for trade contractors. You add an estimate (or import the PDF), and QuoteFollow emails the customer a short, friendly follow-up on Day 2, Day 5, and Day 9 until they reply, accept, or decline.",
  },
  {
    question: "Who is QuoteFollow for?",
    answer:
      "Roofing, HVAC, and plumbing contractors and other home-service businesses that send estimates and lose jobs simply because nobody followed up.",
  },
  {
    question: "What happens when a customer replies?",
    answer:
      "Follow-ups for that quote pause automatically. The reply appears on the quote, a copy is forwarded to your business inbox, and your team is notified so someone can respond.",
  },
  {
    question: "Can I import my existing PDF estimates?",
    answer:
      "Yes. Upload a PDF estimate and QuoteFollow reads the customer name, email, amount, and dates for you to review before the quote is saved.",
  },
  {
    question: "Can I change the follow-up emails and timing?",
    answer:
      "Yes. You can edit each follow-up's wording and day, add or remove steps, and create separate sequences. Emails only go out during business hours in your time zone.",
  },
  {
    question: "Will my customers feel spammed?",
    answer:
      "Follow-ups are short and spaced out, stop as soon as the customer replies or the quote is accepted, declined, or expires, and every email includes a one-click unsubscribe link.",
  },
  {
    question: "How much does QuoteFollow cost?",
    answer: `QuoteFollow costs $${PLAN_CATALOG.starter.priceMonthly} per month for the whole team, after a ${TRIAL_DAYS}-day free trial with full access.`,
  },
] as const;
