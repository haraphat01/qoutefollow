import { PLAN_BENEFITS, PLAN_CATALOG, TRIAL_DAYS } from "@/lib/billing/plans";
import { FAQ, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

/** A plain-text summary for AI assistants (https://llmstxt.org). */
export function GET() {
  const url = siteUrl();
  const body = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Key facts",
    "",
    "- Category: quote and estimate follow-up software (web app)",
    "- For: roofing, HVAC, and plumbing contractors and other home-service businesses",
    `- Price: $${PLAN_CATALOG.starter.priceMonthly}/month per workspace after a ${TRIAL_DAYS}-day free trial with full access`,
    "- Default follow-up schedule: Day 2, Day 5, and Day 9 after the quote is sent, during business hours",
    "- Follow-ups stop automatically when the customer replies, or the quote is accepted, declined, or expires",
    "",
    "## Features",
    "",
    ...PLAN_BENEFITS.map((benefit) => `- ${benefit}`),
    "- Team notes with @mentions and email alerts when a customer replies",
    "- One-click unsubscribe in every follow-up email",
    "",
    "## FAQ",
    "",
    ...FAQ.flatMap((item) => [`### ${item.question}`, "", item.answer, ""]),
    "## Links",
    "",
    `- [Home and pricing](${url}/)`,
    `- [Start a free trial](${url}/register)`,
    `- [Sign in](${url}/login)`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
