import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";

import { formatDateTime, humanizeAction } from "@/components/admin/activity-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminSession } from "@/lib/auth/admin";
import { formatPlanLabel, formatSubscriptionStatus } from "@/lib/billing/labels";
import { formatDate } from "@/lib/format";
import { DeliverabilityChecklist } from "@/components/settings/deliverability-checklist";
import { RESEND_DOMAIN_DNS_STEPS } from "@/lib/email/sending-domain";
import {
  getPlatformStats,
  listAdminActions,
  listAdminUsers,
  listAdminWorkspaces,
} from "@/lib/queries/admin";

const TABS = [
  { id: "users", label: "Users" },
  { id: "workspaces", label: "Workspaces" },
  { id: "log", label: "Admin log" },
  { id: "platform", label: "Platform" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; filter?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    notFound();
  }

  const query = await searchParams;
  const tab: Tab = TABS.some((item) => item.id === query.tab)
    ? (query.tab as Tab)
    : "users";
  const search = query.q?.slice(0, 100) ?? "";
  const flaggedOnly = query.filter === "flagged";

  const stats = await getPlatformStats();

  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow mb-2">PLATFORM</p>
        <h1 className="page-heading">Admin</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Every account on QuoteFollow. Bans and deletions take effect immediately and are recorded in the admin log.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Users" value={stats.users} hint={`${stats.newUsers} new in 30 days`} />
        <StatCard label="Workspaces" value={stats.workspaces} hint={`${stats.suspendedWorkspaces} suspended`} />
        <StatCard label="Quotes" value={stats.quotes} hint={`${stats.followUpsSent30d} follow-ups sent in 30 days`} />
        <StatCard label="Banned users" value={stats.bannedUsers} hint="Can't sign in" />
      </div>

      <nav aria-label="Admin sections" className="flex gap-1 border-b border-border">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={`/admin?tab=${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === item.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "log" ? (
        <AdminLog />
      ) : tab === "platform" ? (
        <PlatformSetup />
      ) : (
        <Card className="gap-0">
          <CardHeader className="pb-4">
            <form method="get" action="/admin" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value={tab} />
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={search}
                  placeholder={tab === "users" ? "Search name, email or workspace" : "Search workspace name"}
                  className="pl-8"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="filter" value="flagged" defaultChecked={flaggedOnly} />
                {tab === "users" ? "Banned only" : "Suspended only"}
              </label>
              <Button type="submit" variant="outline">Search</Button>
            </form>
          </CardHeader>
          <CardContent className="pt-0">
            {tab === "users" ? (
              <UsersTable search={search} bannedOnly={flaggedOnly} />
            ) : (
              <WorkspacesTable search={search} suspendedOnly={flaggedOnly} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="gap-1 py-5">
      <CardContent>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value.toLocaleString("en-US")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ columns, text }: { columns: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="py-10 text-center text-sm text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

async function UsersTable({ search, bannedOnly }: { search: string; bannedOnly: boolean }) {
  const rows = await listAdminUsers({ search, bannedOnly });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Workspace</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Last sign-in</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <EmptyRow columns={5} text="No users match." /> : null}
        {rows.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <Link href={`/admin/users/${user.id}`} className="font-semibold hover:text-primary">
                {user.name}
              </Link>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </TableCell>
            <TableCell>
              {user.workspaceId ? (
                <Link href={`/admin/workspaces/${user.workspaceId}`} className="hover:text-primary">
                  {user.workspaceName}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
              {user.role ? <p className="text-xs capitalize text-muted-foreground">{user.role}</p> : null}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {user.bannedAt ? <Badge variant="destructive">Banned</Badge> : null}
                {user.emailVerifiedAt ? null : <Badge variant="outline">Unverified</Badge>}
                {!user.bannedAt && user.emailVerifiedAt ? <Badge variant="secondary">Active</Badge> : null}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground">
              {user.lastSeenAt ? formatDate(user.lastSeenAt) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function WorkspacesTable({ search, suspendedOnly }: { search: string; suspendedOnly: boolean }) {
  const rows = await listAdminWorkspaces({ search, suspendedOnly });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Workspace</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Members</TableHead>
          <TableHead>Quotes</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <EmptyRow columns={5} text="No workspaces match." /> : null}
        {rows.map((workspace) => (
          <TableRow key={workspace.id}>
            <TableCell>
              <Link href={`/admin/workspaces/${workspace.id}`} className="font-semibold hover:text-primary">
                {workspace.name}
              </Link>
              <p className="text-xs capitalize text-muted-foreground">{workspace.trade}</p>
              {workspace.suspendedAt ? <Badge variant="destructive" className="mt-1">Suspended</Badge> : null}
            </TableCell>
            <TableCell>
              <p>{formatPlanLabel(workspace.subscriptionPlan)}</p>
              <p className="text-xs text-muted-foreground">{formatSubscriptionStatus(workspace.subscriptionStatus)}</p>
            </TableCell>
            <TableCell>{workspace.members}</TableCell>
            <TableCell>{workspace.quotes}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(workspace.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PlatformSetup() {
  return (
    <div className="space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Email setup checklist</CardTitle>
          <CardDescription>Server settings every workspace depends on (Coolify environment variables).</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DeliverabilityChecklist
            emailFrom={process.env.EMAIL_FROM}
            hasResendKey={Boolean(process.env.RESEND_API_KEY)}
            hasWebhookSecret={Boolean(process.env.RESEND_WEBHOOK_SECRET)}
          />
        </CardContent>
      </Card>
      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Sending domain (Resend)</CardTitle>
          <CardDescription>One-time setup so email comes from your domain.</CardDescription>
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
          <a
            href="https://resend.com/docs/dashboard/domains/introduction"
            className="text-sm font-semibold text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resend domain documentation
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

async function AdminLog() {
  const entries = await listAdminActions(100);

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>Admin log</CardTitle>
        <CardDescription>The last 100 admin actions, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? <EmptyRow columns={4} text="No admin actions yet." /> : null}
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                <TableCell>{entry.adminEmail}</TableCell>
                <TableCell>
                  {humanizeAction(entry.action)}
                  {entry.details ? <p className="text-xs text-muted-foreground">{entry.details}</p> : null}
                </TableCell>
                <TableCell>{entry.targetLabel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
