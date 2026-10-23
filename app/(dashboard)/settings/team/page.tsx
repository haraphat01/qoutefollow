import {
  AddTeamMemberForm,
  ChangePasswordForm,
  TeamMemberList,
} from "@/components/settings/team-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { listOrganizationMembers } from "@/lib/queries/members";

export default async function TeamSettingsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const members = await listOrganizationMembers(session.organization.id);
  const isOwner = session.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">WORKSPACE</p>
        <h1 className="page-heading">Team</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Everyone here can work quotes, post team notes, and be @mentioned.
        </p>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "person" : "people"} in {session.organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <TeamMemberList
            members={members}
            currentUserId={session.user.id}
            isOwner={isOwner}
          />
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Add a teammate</CardTitle>
            <CardDescription>
              Create a login for someone on your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AddTeamMemberForm />
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Your password</CardTitle>
          <CardDescription>Signed in as {session.user.email}.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
