import { TriangleAlert } from "lucide-react";

import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { MailingComplianceForm } from "@/components/settings/mailing-compliance-form";
import {
  DefaultsForm,
  LogoForm,
  PriceBookManager,
  TemplateList,
} from "@/components/settings/quoting-settings";
import { SendTimezoneForm } from "@/components/settings/send-timezone-form";
import { SuppressionList } from "@/components/settings/suppression-list";
import { WeeklySummarySettings } from "@/components/settings/weekly-summary-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { DEFAULT_SEND_TIMEZONE } from "@/lib/follow-ups/send-window";
import { getOrganizationEmailSettings } from "@/lib/queries/organization-settings";
import { getQuotingSettings, listPriceBook, listQuoteTemplates } from "@/lib/queries/quoting";
import { listEmailSuppressions } from "@/lib/queries/suppressions";

const SECTIONS = [
  { id: "business", label: "Business profile" },
  { id: "quotes", label: "Quotes" },
  { id: "sending", label: "Sending" },
  { id: "unsubscribed", label: "Unsubscribed" },
] as const;

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div id={id} className="scroll-mt-24 pt-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const organizationId = session.organization.id;
  const [emailSettings, quoting, priceBook, templates, suppressions] = await Promise.all([
    getOrganizationEmailSettings(organizationId),
    getQuotingSettings(organizationId),
    listPriceBook(organizationId),
    listQuoteTemplates(organizationId),
    listEmailSuppressions(organizationId),
  ]);
  const isOwner = session.role === "owner";
  const missingAddress = !emailSettings?.mailingAddress?.trim();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">WORKSPACE</p>
        <h1 className="page-heading">Settings</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Your business details, quote defaults and how emails go out to customers.
        </p>
        <nav aria-label="Settings sections" className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>

      {missingAddress ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Add your business mailing address below. US law (CAN-SPAM) requires a postal address in the footer of emails to customers.
          </span>
        </p>
      ) : null}

      <SectionHeading id="business" title="Business profile" description="What customers see on quotes, PDFs and emails." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>Your name, reply-to email, phone and signature on every customer email.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <EmailSettingsForm
              isOwner={isOwner}
              businessName={session.organization.name}
              businessPhone={emailSettings?.businessPhone ?? null}
              emailSignature={emailSettings?.emailSignature ?? null}
              replyEmail={emailSettings?.replyEmail ?? null}
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Shown on online quotes, PDFs and customer emails.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <LogoForm
                isOwner={isOwner}
                logoSrc={quoting.hasLogo ? `/api/logo/${organizationId}?v=${quoting.logoVersion}` : null}
              />
            </CardContent>
          </Card>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>Mailing address</CardTitle>
              <CardDescription>Printed in the footer of every customer email, as the law requires.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <MailingComplianceForm mailingAddress={emailSettings?.mailingAddress ?? null} isOwner={isOwner} />
            </CardContent>
          </Card>
        </div>
      </div>

      <SectionHeading id="quotes" title="Quotes" description="Defaults, saved prices and templates for faster quoting." />
      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Tax</CardTitle>
          <CardDescription>Applied after any discount.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DefaultsForm defaultTaxRate={quoting.defaultTaxRate} isOwner={isOwner} />
        </CardContent>
      </Card>
      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Price book</CardTitle>
          <CardDescription>Saved items and prices you can pick while writing a quote.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <PriceBookManager items={priceBook} />
        </CardContent>
      </Card>
      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Starting points for common jobs. Pick one when creating a quote.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <TemplateList templates={templates} />
        </CardContent>
      </Card>

      <SectionHeading id="sending" title="Sending" description="When follow-ups go out, and your weekly summary." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Time zone</CardTitle>
            <CardDescription>Follow-ups only go out during business hours here. Dates on quotes use it too.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <SendTimezoneForm sendTimezone={emailSettings?.sendTimezone ?? DEFAULT_SEND_TIMEZONE} isOwner={isOwner} />
          </CardContent>
        </Card>
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Weekly summary</CardTitle>
            <CardDescription>A Monday-morning snapshot of how your quotes are doing.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <WeeklySummarySettings
              enabled={emailSettings?.weeklySummaryEnabled ?? true}
              isOwner={isOwner}
              email={session.user.email}
            />
          </CardContent>
        </Card>
      </div>

      <SectionHeading id="unsubscribed" title="Unsubscribed customers" description="People who unsubscribed or whose address bounced. QuoteFollow won't email them." />
      <Card className="gap-0">
        <CardContent className="pt-6">
          <SuppressionList rows={suppressions} isOwner={isOwner} />
        </CardContent>
      </Card>
    </div>
  );
}
