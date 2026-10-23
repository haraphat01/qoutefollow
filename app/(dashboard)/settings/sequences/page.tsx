import Link from "next/link";

import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { SequenceEditor } from "@/components/settings/sequence-editor";
import { SequenceManager } from "@/components/settings/sequence-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getOrganizationEmailSettings } from "@/lib/queries/organization-settings";
import {
  getDefaultSequence,
  getSequenceWithSteps,
  listOrganizationSequences,
} from "@/lib/queries/sequences";

export default async function FollowUpSequencesPage({
  searchParams,
}: {
  searchParams: Promise<{ sequence?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const query = await searchParams;
  const [allSequences, emailSettings] = await Promise.all([
    listOrganizationSequences(session.organization.id),
    getOrganizationEmailSettings(session.organization.id),
  ]);

  const activeId =
    query.sequence ??
    allSequences.find((s) => s.isDefault)?.id ??
    allSequences[0]?.id;

  const data = activeId
    ? await getSequenceWithSteps(session.organization.id, activeId)
    : await getDefaultSequence(session.organization.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">AUTOMATION</p>
        <h1 className="page-heading">Follow-up sequences</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Maintain multiple cadences (e.g. high-ticket vs service call) and pick
          a default for new quotes.
        </p>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Your sequences</CardTitle>
          <CardDescription>
            New quotes use the default unless you choose another on the quote.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {allSequences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sequences yet.</p>
          ) : (
            <SequenceManager
              sequences={allSequences}
              activeSequenceId={data?.sequence.id ?? activeId ?? ""}
            />
          )}
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>{data?.sequence.name ?? "Edit sequence"}</CardTitle>
          <CardDescription>
            Changes apply to message content immediately and reschedule pending
            touchpoints on open quotes using this sequence.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {!data ? (
            <p className="text-sm text-muted-foreground">
              Select a sequence to edit.
            </p>
          ) : (
            <SequenceEditor
              key={data.sequence.id}
              sequenceId={data.sequence.id}
              name={data.sequence.name}
              steps={data.steps.map((step) => ({
                id: step.id,
                dayOffset: step.dayOffset,
                subject: step.subject,
                bodyTemplate: step.bodyTemplate,
                sortOrder: step.sortOrder,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Email defaults</CardTitle>
          <CardDescription>
            Signature and phone merge into every follow-up alongside your
            templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <EmailSettingsForm
            isOwner={session.role === "owner"}
            businessName={session.organization.name}
            businessPhone={emailSettings?.businessPhone ?? null}
            emailSignature={emailSettings?.emailSignature ?? null}
            replyEmail={emailSettings?.replyEmail ?? null}
          />
        </CardContent>
      </Card>

      <Link
        href="/dashboard"
        className="text-sm font-semibold text-primary hover:underline"
      >
        Back to overview
      </Link>
    </div>
  );
}
