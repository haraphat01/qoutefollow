import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActivityList, formatDateTime } from "@/components/admin/activity-list";
import { AdminActionButton, BanUserForm } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  banUserAction,
  deleteUserAction,
  revokeUserSessionsAction,
  unbanUserAction,
  verifyUserEmailAction,
} from "@/lib/actions/admin";
import { getAdminSession, isAdminEmail } from "@/lib/auth/admin";
import { formatDate } from "@/lib/format";
import { getAdminUser } from "@/lib/queries/admin";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    notFound();
  }

  const { id } = await params;
  const detail = await getAdminUser(id).catch(() => null);
  if (!detail) {
    notFound();
  }

  const { user, sessions, activity } = detail;
  const isSelf = user.id === admin.user.id;
  const isProtected = isSelf || isAdminEmail(user.email);
  const isOwner = user.role === "owner";

  return (
    <div className="space-y-6">
      <Link href="/admin?tab=users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">USER</p>
          <h1 className="page-heading">{user.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.bannedAt ? <Badge variant="destructive">Banned {formatDate(user.bannedAt)}</Badge> : null}
            {user.emailVerifiedAt ? <Badge variant="secondary">Email verified</Badge> : <Badge variant="outline">Email not verified</Badge>}
            {isAdminEmail(user.email) ? <Badge>Admin</Badge> : null}
            {user.workspaceSuspendedAt ? <Badge variant="destructive">Workspace suspended</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd>
                {user.workspaceId ? (
                  <Link href={`/admin/workspaces/${user.workspaceId}`} className="font-medium hover:text-primary">
                    {user.workspaceName}
                  </Link>
                ) : (
                  "None (removed from their workspace)"
                )}
              </dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="capitalize">{user.role ?? "—"}</dd>
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
              <dt className="text-muted-foreground">Signed in on</dt>
              <dd>{sessions.length} {sessions.length === 1 ? "device" : "devices"}{sessions[0] ? `, latest ${formatDateTime(sessions[0].createdAt)}` : ""}</dd>
              {user.banReason ? (
                <>
                  <dt className="text-muted-foreground">Ban reason</dt>
                  <dd>{user.banReason}</dd>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              {isSelf
                ? "This is your account, so ban and delete are disabled."
                : isProtected
                  ? "This user is an admin. Remove them from ADMIN_EMAILS to ban or delete them."
                  : "Changes apply immediately and are recorded in the admin log."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="flex flex-wrap gap-2">
              {user.emailVerifiedAt ? null : (
                <AdminActionButton
                  action={verifyUserEmailAction.bind(null, user.id)}
                  label="Mark email verified"
                  successMessage="Email marked as verified."
                />
              )}
              {!isSelf && sessions.length > 0 ? (
                <AdminActionButton
                  action={revokeUserSessionsAction.bind(null, user.id)}
                  label="Sign out everywhere"
                  successMessage="All of their sessions were ended."
                />
              ) : null}
              {user.bannedAt ? (
                <AdminActionButton
                  action={unbanUserAction.bind(null, user.id)}
                  label="Unban"
                  successMessage="User unbanned. They can sign in again."
                />
              ) : null}
            </div>

            {!isProtected && !user.bannedAt ? (
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-semibold">Ban</p>
                <BanUserForm
                  action={banUserAction.bind(null, user.id)}
                  canSuspendWorkspace={isOwner && !user.workspaceSuspendedAt}
                  workspaceName={user.workspaceName}
                />
              </div>
            ) : null}

            {!isProtected ? (
              <div className="border-t border-border pt-4">
                <p className="mb-1 text-sm font-semibold">Delete</p>
                <p className="mb-3 text-xs leading-5 text-muted-foreground">
                  {isOwner
                    ? "If they're the only member, their workspace and all its quotes, customers and files are deleted too, and any Stripe subscription is cancelled. If they have teammates, the workspace stays and passes to the next teammate."
                    : "Removes their login and their team notes. Their workspace keeps its quotes."}
                </p>
                <AdminActionButton
                  action={deleteUserAction.bind(null, user.id)}
                  label="Delete user"
                  destructive
                  confirm={`Permanently delete ${user.email}? This can't be undone.`}
                  successMessage="User deleted."
                  redirectTo="/admin?tab=users"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>The last 100 things this user did in their workspace.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ActivityList items={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
