"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CreditCard,
  FileText,
  FileUp,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelsTopLeft,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppSession } from "@/lib/auth/session";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/quotes/import", label: "Import PDF", icon: FileUp },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings/sequences", label: "Follow-ups", icon: PanelsTopLeft },
  { href: "/settings/email", label: "Email", icon: Mail },
  { href: "/settings/team", label: "Team", icon: UsersRound },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
] as const;

const ADMIN_NAV = { href: "/admin", label: "Admin", icon: ShieldCheck } as const;

type NavItem = (typeof NAV)[number] | typeof ADMIN_NAV;

function isActiveNavItem(pathname: string, href: string) {
  if (href === "/quotes") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith("/quotes/import"));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Sign-out is a POST so a stray link or prefetch can't log anyone out. */
function SignOutForm({
  children,
  className,
  formRef,
}: {
  children?: React.ReactNode;
  className?: string;
  formRef?: React.Ref<HTMLFormElement>;
}) {
  return (
    <form ref={formRef} action="/api/auth/logout" method="post" className={className}>
      {children}
    </form>
  );
}

function BrandMark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3" aria-label="QuoteFollow overview">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
        <PanelsTopLeft className="size-[1.1rem]" strokeWidth={2.2} />
      </span>
      <span className="text-[0.95rem] font-bold tracking-tight text-white">QuoteFollow</span>
    </Link>
  );
}

function SidebarContent({
  session,
  navItems,
  pathname,
  onNavigate,
}: {
  session: AppSession;
  navItems: readonly NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-4 mb-4 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3">
        <p className="mb-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/45">
          Workspace
        </p>
        <p className="truncate text-sm font-semibold text-white">{session.organization.name}</p>
        <p className="mt-0.5 text-xs capitalize text-white/60">{session.organization.trade} contractor</p>
      </div>

      {/* Only the links scroll, so the account block below stays reachable on short screens. */}
      <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {navItems.map((item) => {
          const active = isActiveNavItem(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [@media(min-height:800px)]:py-2.5 ${
                active
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-white/65 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <item.icon className="size-[1.05rem] shrink-0" strokeWidth={1.9} />
              {item.label}
              {active ? <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" /> : null}
            </Link>
          );
        })}

        <div className="mt-4 hidden rounded-xl border border-white/10 bg-white/[0.05] p-3 [@media(min-height:820px)]:block">
          <p className="text-xs font-semibold text-white/90">Keep every estimate moving</p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">
            Follow-ups help good quotes stay top of mind.
          </p>
          <Link
            href="/quotes/new"
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sidebar-primary hover:text-white"
          >
            Add a quote <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
            {initialsOf(session.user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{session.user.name}</p>
            <p className="truncate text-xs text-white/55">{session.user.email}</p>
          </div>
        </div>
        <SignOutForm>
          <Button
            type="submit"
            variant="ghost"
            className="mt-1 h-10 w-full justify-start gap-3 px-3 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </SignOutForm>
      </div>
    </div>
  );
}

function AccountMenu({ session }: { session: AppSession }) {
  const signOutRef = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-muted sm:pl-3 data-[state=open]:bg-muted"
          aria-label="Account menu"
        >
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-semibold leading-tight">{session.user.name}</span>
            <span className="block text-xs capitalize text-muted-foreground">{session.role}</span>
          </span>
          <span className="grid size-9 place-items-center rounded-full border border-primary/15 bg-primary/10 text-xs font-bold text-primary">
            {initialsOf(session.user.name)}
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{session.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/team"><KeyRound className="size-4" /> Team &amp; password</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing"><CreditCard className="size-4" /> Billing</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => signOutRef.current?.requestSubmit()}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <SignOutForm formRef={signOutRef} className="hidden" />
    </DropdownMenu>
  );
}

export function AppShell({
  session,
  isAdmin,
  children,
}: {
  session: AppSession;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems: readonly NavItem[] = isAdmin ? [...NAV, ADMIN_NAV] : NAV;
  const [menuOpen, setMenuOpen] = useState(false);
  const pageLabel = navItems.find((item) => isActiveNavItem(pathname, item.href))?.label ?? "Workspace";

  // Links close the menu themselves; Escape closes it too, and the page can't scroll behind it.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[17rem]">
        <div className="shrink-0 px-6 py-6">
          <BrandMark />
        </div>
        <SidebarContent session={session} navItems={navItems} pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!menuOpen}
          className={`absolute inset-y-0 left-0 flex w-[min(19rem,86vw)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between px-5 py-4">
            <BrandMark onNavigate={() => setMenuOpen(false)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <SidebarContent
            session={session}
            navItems={navItems}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </aside>
      </div>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur md:px-8 lg:static lg:h-[4.5rem] lg:bg-card/75 lg:px-10">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-ml-1 shrink-0 lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {session.organization.name}
              </p>
              <p className="truncate text-sm font-semibold tracking-tight">{pageLabel}</p>
            </div>
          </div>
          <AccountMenu session={session} />
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-5 md:px-8 md:py-9 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
