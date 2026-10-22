"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  FileText,
  FileUp,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  PanelsTopLeft,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppSession } from "@/lib/auth/session";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/quotes/import", label: "Import PDF", icon: FileUp },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings/sequences", label: "Follow-ups", icon: PanelsTopLeft },
  { href: "/settings/email", label: "Email", icon: Mail },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
] as const;

function isActiveNavItem(pathname: string, href: string) {
  if (href === "/quotes") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith("/quotes/import"));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  session,
  children,
}: {
  session: AppSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = session.user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="flex shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-[17rem] lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <div className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <PanelsTopLeft className="size-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.95rem] font-bold tracking-tight text-white">
              QuoteFollow
            </p>
            <p className="mt-0.5 text-[0.68rem] font-medium tracking-wide text-white/55">
              YOUR FOLLOW-UP WORKSPACE
            </p>
          </div>
        </div>

        <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 lg:mx-4">
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/45">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold text-white">
            {session.organization.name}
          </p>
          <p className="mt-1 text-xs capitalize text-white/60">
            {session.organization.trade} contractor
          </p>
        </div>

        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3">
          <p className="hidden px-3 pb-2 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/40 lg:block">
            Workspace
          </p>
          {NAV.map((item) => {
            const active = isActiveNavItem(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${
                  active
                    ? "bg-sidebar-accent text-white shadow-sm"
                    : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <item.icon className="size-[1.05rem]" strokeWidth={1.9} />
                {item.label}
                {active ? <span className="ml-auto hidden size-1.5 rounded-full bg-sidebar-primary lg:block" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden px-4 pb-4 lg:block">
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
            <p className="text-xs font-semibold text-white/90">
              Keep every estimate moving
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              Follow-ups help good quotes stay top of mind.
            </p>
            <Link
              href="/quotes/new"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sidebar-primary hover:text-white"
            >
              Add a quote <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-3 px-3 text-sm text-white/60 hover:bg-white/[0.07] hover:text-white"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>

        <form action="/api/auth/logout" method="post" className="px-4 pb-3 lg:hidden">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="gap-2 text-white/65 hover:bg-white/[0.07] hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-[4.5rem] items-center justify-between border-b border-border/80 bg-card/75 px-5 md:px-8 lg:px-10">
          <div className="min-w-0">
            <p className="hidden text-xs text-muted-foreground sm:block">
              {session.organization.name}
            </p>
            <p className="truncate text-sm font-semibold tracking-tight">
              {NAV.find((item) => isActiveNavItem(pathname, item.href))?.label ?? "Workspace"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{session.user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {session.organization.trade}
              </p>
            </div>
            <div
              aria-label={`${session.user.name} profile`}
              className="grid size-9 place-items-center rounded-full border border-primary/15 bg-primary/10 text-xs font-bold text-primary"
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 md:px-8 md:py-9 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
