import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActivityList, formatDateTime } from "@/components/admin/activity-list";
import { AdminActionButton } from "@/components/admin/admin-controls";
import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteQuoteAction,
  deleteWorkspaceAction,
  stopQuoteFollowUpsAction,
  stopWorkspaceFollowUpsAction,
  suspendWorkspaceAction,
  unsuspendWorkspaceAction,
} from "@/lib/actions/admin";
import { getAdminSession, isAdminEmail } from "@/lib/auth/admin";
import { formatPlanLabel, formatSubscriptionStatus } from "@/lib/billing/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import { getAdminWorkspace } from "@/lib/queries/admin";

export default async function AdminWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    notFound();
  }

  const { id } = await params;
  const detail = await getAdminWorkspace(id).catch(() => null);
  if (!detail) {
    notFound();
  }

  const { workspace, members, quotes, activity, customerCount } = detail;
  const hasAdmin = members.some((member) => isAdminEmail(member.email));
  const pendingTotal = quotes.reduce((sum, quote) => sum + quote.pendingFollowUps, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin?tab=workspaces" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All workspaces
      </Link>

      <div>
        <p className="eyebrow mb-2">WORKSPACE</p>
        <h1 className="page-heading">{workspace.name}</h1>
        <p className="mt-2 text-sm capitalize text-muted-foreground">
          {workspace.trade} · created {formatDate(workspace.createdAt)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {workspace.suspendedAt ? <Badge variant="destructive">Suspended {formatDate(workspace.suspendedAt)}</Badge> : null}
          <Badge variant="secondary">
            {formatPlanLabel(workspace.subscriptionPlan)} · {formatSubscriptionStatus(workspace.subscriptionStatus)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Reply-to email</dt>
              <dd className="break-all">{workspace.replyEmail ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{workspace.businessPhone ?? "—"}</dd>
              <dt className="text-muted-foreground">Customers</dt>
              <dd>{customerCount}</dd>
              <dt className="text-muted-foreground">Quotes</dt>
              <dd>{quotes.length}</dd>
              <dt className="text-muted-foreground">Queued follow-ups</dt>
              <dd>{pendingTotal}</dd>
              <dt className="text-muted-foreground">Stripe customer</dt>
              <dd className="break-all">{workspace.stripeCustomerId ?? "—"}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              {hasAdmin
                ? "An admin belongs to this workspace, so suspend and delete are disabled."
                : "Changes apply immediately and are recorded in the admin log."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {pendingTotal > 0 ? (
                <AdminActionButton
                  action={stopWorkspaceFollowUpsAction.bind(null, workspace.id)}
                  label="Stop all follow-ups"
                  confirm={`Cancel ${pendingTotal} queued follow-up email${pendingTotal === 1 ? "" : "s"} and turn off automation on every quote?`}
                  successMessage="All follow-ups stopped."
                />
              ) : null}
              {workspace.suspendedAt ? (
                <AdminActionButton
                  action={unsuspendWorkspaceAction.bind(null, workspace.id)}
                  label="Lift suspension"
                  successMessage="Suspension lifted. Members can sign in and follow-ups resume."
                />
              ) : hasAdmin ? null : (
                <AdminActionButton
                  action={suspendWorkspaceAction.bind(null, workspace.id)}
                  label="Suspend workspace"
                  confirm="Sign out every member, block sign-in and pause follow-up emails until you lift it?"
                  successMessage="Workspace suspended."
                />
              )}
            </div>
            {hasAdmin ? null : (
              <div className="border-t border-border pt-4">
                <p className="mb-1 text-sm font-semibold">Delete workspace</p>
                <p className="mb-3 text-xs leading-5 text-muted-foreground">
                  Deletes all {members.length} member login{members.length === 1 ? "" : "s"}, quotes, customers, follow-ups and uploaded PDFs, and cancels any Stripe subscription.
                </p>
                <AdminActionButton
                  action={deleteWorkspaceAction.bind(null, workspace.id)}
                  label="Delete workspace"
                  destructive
                  confirm={`Permanently delete "${workspace.name}" and everyone in it? This can't be undone.`}
                  successMessage="Workspace deleted."
                  redirectTo="/admin?tab=workspaces"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="divide-y divide-border rounded-xl border border-border/80">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <Link href={`/admin/users/${member.id}`} className="text-sm font-semibold hover:text-primary">
                    {member.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex gap-1.5">
                  {member.bannedAt ? <Badge variant="destructive">Banned</Badge> : null}
                  {member.emailVerifiedAt ? null : <Badge variant="outline">Unverified</Badge>}
                  <Badge variant={member.role === "owner" ? "default" : "secondary"} className="capitalize">{member.role}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
          <CardDescription>Newest first, up to 200.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Queued</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No quotes yet.</TableCell>
                </TableRow>
              ) : null}
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>
                    <p className="font-semibold">{quote.quoteNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(quote.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <p>{quote.customerName}</p>
                    <p className="text-xs text-muted-foreground">{quote.customerEmail}</p>
                  </TableCell>
                  <TableCell>{formatCurrency(quote.amount)}</TableCell>
                  <TableCell>
                    <QuoteStatusBadge status={quote.status} />
                    {quote.followUpsEnabled ? null : <p className="mt-1 text-xs text-muted-foreground">Automation off</p>}
                  </TableCell>
                  <TableCell>{quote.pendingFollowUps}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {quote.pendingFollowUps > 0 ? (
                        <AdminActionButton
                          action={stopQuoteFollowUpsAction.bind(null, quote.id)}
                          label="Stop follow-ups"
                          successMessage={`Follow-ups stopped for ${quote.quoteNumber}.`}
                        />
                      ) : null}
                      <AdminActionButton
                        action={deleteQuoteAction.bind(null, quote.id)}
                        label="Delete"
                        destructive
                        confirm={`Delete ${quote.quoteNumber} with its follow-ups, replies and notes?`}
                        successMessage={`${quote.quoteNumber} deleted.`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>The last 100 events in this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ActivityList items={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
