import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";

export const instant = false;

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    // Clears a stale cookie first; otherwise the proxy bounces /login back here.
    redirect("/api/auth/clear-session");
  }
  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }

  return (
    <AppShell session={session} isAdmin={isAdminEmail(session.user.email)}>
      {children}
    </AppShell>
  );
}
