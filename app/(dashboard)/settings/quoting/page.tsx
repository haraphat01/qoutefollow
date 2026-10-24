import {
  DefaultsForm,
  LogoForm,
  PriceBookManager,
  TemplateList,
} from "@/components/settings/quoting-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getQuotingSettings, listPriceBook, listQuoteTemplates } from "@/lib/queries/quoting";

export default async function QuotingSettingsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const organizationId = session.organization.id;
  const [settings, priceBook, templates] = await Promise.all([
    getQuotingSettings(organizationId),
    listPriceBook(organizationId),
    listQuoteTemplates(organizationId),
  ]);
  const isOwner = session.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">QUOTING</p>
        <h1 className="page-heading">Quote settings</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Your logo, tax default, saved prices and templates for faster quotes.
        </p>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Appears on online quotes, PDFs and emails to customers.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LogoForm
            isOwner={isOwner}
            logoSrc={settings.hasLogo ? `/api/logo/${organizationId}?v=${settings.logoVersion}` : null}
          />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Tax</CardTitle>
          <CardDescription>Applied after any discount.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DefaultsForm defaultTaxRate={settings.defaultTaxRate} isOwner={isOwner} />
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
    </div>
  );
}
