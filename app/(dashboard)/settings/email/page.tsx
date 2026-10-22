import Link from "next/link";

import { DeliverabilityChecklist } from "@/components/settings/deliverability-checklist";
import { MailingComplianceForm } from "@/components/settings/mailing-compliance-form";
import { SendTimezoneForm } from "@/components/settings/send-timezone-form";
import { DEFAULT_SEND_TIMEZONE } from "@/lib/follow-ups/send-window";
import { SuppressionList } from "@/components/settings/suppression-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { RESEND_DOMAIN_DNS_STEPS } from "@/lib/email/sending-domain";
import { getOrganizationEmailSettings } from "@/lib/queries/organization-settings";
import { listEmailSuppressions } from "@/lib/queries/suppressions";

export default async function EmailDeliverabilityPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const [settings, suppressions] = await Promise.all([
    getOrganizationEmailSettings(session.organization.id),
    listEmailSuppressions(session.organization.id),
  ]);

  const emailFrom = process.env.EMAIL_FROM;
  const isOwner = session.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">TRUST & DELIVERABILITY</p>
        <h1 className="page-heading">Email & compliance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Configure branded sending, CAN-SPAM footer details, and review
          addresses that cannot receive follow-ups.
        </p>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Deliverability checklist</CardTitle>
          <CardDescription>
            Production sending on Coolify uses Resend and your environment
            variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DeliverabilityChecklist
            emailFrom={emailFrom}
            hasResendKey={Boolean(process.env.RESEND_API_KEY)}
            hasWebhookSecret={Boolean(process.env.RESEND_WEBHOOK_SECRET)}
            mailingAddress={settings?.mailingAddress ?? null}
          />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Domain setup (Resend)</CardTitle>
          <CardDescription>
            Send from your own domain so customers see your business, not a
            generic provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            {RESEND_DOMAIN_DNS_STEPS.map((step) => (
              <li key={step.title}>
                <span className="font-medium text-foreground">{step.title}</span>
                <p className="mt-1">{step.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm">
            <a
              href="https://resend.com/docs/dashboard/domains/introduction"
              className="font-semibold text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resend domain documentation
            </a>
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Send window</CardTitle>
          <CardDescription>
            When automated follow-ups may leave your inbox (business hours only).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SendTimezoneForm
            sendTimezone={settings?.sendTimezone ?? DEFAULT_SEND_TIMEZONE}
            isOwner={isOwner}
          />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>CAN-SPAM footer</CardTitle>
          <CardDescription>
            U.S. commercial email requires a valid physical mailing address in
            the message footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <MailingComplianceForm
            mailingAddress={settings?.mailingAddress ?? null}
            isOwner={isOwner}
          />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Suppressed addresses</CardTitle>
          <CardDescription>
            Follow-ups will not send to these emails until you remove the block
            (use carefully).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SuppressionList rows={suppressions} isOwner={isOwner} />
        </CardContent>
      </Card>

      <Link
        href="/settings/sequences"
        className="text-sm font-semibold text-primary hover:underline"
      >
        Back to follow-up templates
      </Link>
    </div>
  );
}
