export function parseEmailFromAddress(emailFrom: string | undefined) {
  if (!emailFrom?.trim()) {
    return null;
  }
  const angle = emailFrom.match(/<([^>]+)>/);
  const address = angle?.[1] ?? emailFrom.trim();
  const at = address.lastIndexOf("@");
  if (at === -1) {
    return null;
  }
  return {
    address: address.toLowerCase(),
    domain: address.slice(at + 1).toLowerCase(),
  };
}

export const RESEND_DOMAIN_DNS_STEPS = [
  {
    title: "Add your domain in Resend",
    detail:
      "In Resend → Domains, add the domain you send from (not gmail.com). Use a subdomain like mail.yourcompany.com if you prefer.",
  },
  {
    title: "Publish DNS records",
    detail:
      "Copy the SPF and DKIM records Resend provides into your DNS host (Cloudflare, Route 53, etc.). Verification usually completes within an hour.",
  },
  {
    title: "Set EMAIL_FROM",
    detail:
      "Use an address on that verified domain, e.g. QuoteFollow <quotes@mail.yourcompany.com>. Redeploy or restart the app after changing env vars on Coolify.",
  },
  {
    title: "Enable webhooks",
    detail:
      "Point Resend webhooks at /api/webhooks/resend with bounces and complaints enabled so bad addresses are suppressed automatically.",
  },
] as const;
