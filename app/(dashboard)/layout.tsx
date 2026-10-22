import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth/session";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <AppShell session={session}>{children}</AppShell>;
}
