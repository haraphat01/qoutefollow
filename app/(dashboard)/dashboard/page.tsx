import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Info,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { ContractorReminders } from "@/components/dashboard/contractor-reminders";
import { IntelligenceInsights } from "@/components/dashboard/intelligence-insights";
import { DashboardNotifications } from "@/components/dashboard-notifications";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getContractorReminders } from "@/lib/queries/reminders";
import { getDefaultSequence } from "@/lib/queries/sequences";
import {
  countUnreadNotifications,
  listRecentNotifications,
} from "@/lib/queries/notifications";
import { getOrganizationIntelligence } from "@/lib/queries/intelligence";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const [stats, notifications, unreadCount, reminders, defaultSequence, intelligence] =
    await Promise.all([
      getDashboardStats(session.organization.id),
      listRecentNotifications(session.organization.id),
      countUnreadNotifications(session.organization.id),
      getContractorReminders(session.organization.id),
      getDefaultSequence(session.organization.id),
      getOrganizationIntelligence(session.organization.id),
    ]);
  const rhythmSteps = defaultSequence?.steps ?? [];
  const metrics = [
    { label: "Open quotes", value: stats.pendingQuotes, note: "Awaiting a decision", icon: FileText, tone: "bg-[#edf4ed] text-[#4c7959]" },
    { label: "Pipeline value", value: formatCurrency(stats.openPipelineValue), note: "Across open quotes", icon: CircleDollarSign, tone: "bg-[#f5f0e4] text-[#8a7443]" },
    { label: "Follow-ups due", value: stats.followUpsDue, note: "Queued emails ready to send", icon: Clock3, tone: "bg-[#edf1f4] text-[#557080]" },
    { label: "Accepted quotes", value: stats.acceptedQuotes, note: "Ready for the next step", icon: CheckCircle2, tone: "bg-[#f2edf3] text-[#80638a]" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2">YOUR BUSINESS, AT A GLANCE</p>
          <h1 className="page-heading">Welcome back, {session.user.name.split(" ")[0]}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Here’s what’s happening with your quotes at {session.organization.name}.
          </p>
        </div>
        <Button asChild size="lg" className="h-11 gap-2 self-start rounded-xl px-4 sm:self-auto">
          <Link href="/quotes/new"><Plus className="size-4" /> Add a quote</Link>
        </Button>
      </div>

      <section aria-label="Quote metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-0">
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.055em] text-foreground">{metric.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
              </div>
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${metric.tone}`}><metric.icon className="size-[1.15rem]" strokeWidth={1.9} /></span>
            </CardContent>
          </Card>
        ))}
      </section>

      <IntelligenceInsights
        medianReplyHours={intelligence.medianReplyHours}
        acceptedAfterSecondFollowUpRate={
          intelligence.acceptedAfterSecondFollowUpRate
        }
        acceptedWithTwoPlusFollowUps={intelligence.acceptedWithTwoPlusFollowUps}
        acceptedTotal={intelligence.acceptedTotal}
        staleOpenQuotes={intelligence.staleOpenQuotes}
      />

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Reminders for you</CardTitle>
          <CardDescription>
            Quotes that may need a call or a quick review from your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ContractorReminders items={reminders} />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            Customer replies and automation events for your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DashboardNotifications
            items={notifications}
            unreadCount={unreadCount}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <Card className="gap-0">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle>Upcoming follow-ups</CardTitle>
              <CardDescription className="mt-1.5">A clear view of the next touchpoints for your open quotes.</CardDescription>
            </div>
            <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:inline-flex">
              {stats.upcomingFollowUps.length} scheduled
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.upcomingFollowUps.length === 0 ? (
              <div className="empty-state min-h-60">
                <span className="empty-state-icon"><Clock3 className="size-5" /></span>
                <h3 className="mt-4 text-sm font-semibold">Nothing in the queue yet</h3>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Approve a quote with follow-ups enabled and its next touchpoint will show up here.
                </p>
                <Button asChild variant="outline" className="mt-5">
                  <Link href="/quotes/new">Create a quote <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {stats.upcomingFollowUps.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-2 last:pb-1">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary"><FileText className="size-[1.1rem]" /></span>
                      <div>
                        <p className="text-sm font-semibold">{item.quoteNumber}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(item.amount)} <span className="px-1">·</span> {formatDate(item.scheduledFor)}</p>
                      </div>
                    </div>
                    <Link href={`/quotes/${item.quoteId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      View quote <ArrowUpRight className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 flex items-start gap-2 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Due emails are sent by your Coolify scheduled worker. Replies pause automation when Resend inbound is configured.
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden">
          <div className="bg-[#264e3e] px-6 pb-6 pt-6 text-white">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#b8d6b6]">A SIMPLE RHYTHM</p>
            <h2 className="mt-3 text-xl font-semibold leading-snug tracking-[-0.035em]">Every quote deserves a thoughtful next step.</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">Your default sequence is designed to keep the conversation open, not add pressure.</p>
          </div>
          <CardContent className="space-y-0 pt-3">
            {rhythmSteps.length > 0
              ? rhythmSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 border-b border-border/70 py-3 last:border-0"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-[#edf4ed] text-[0.65rem] font-bold text-[#4c7959]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium line-clamp-1">
                      {step.subject}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      Day {step.dayOffset}
                    </span>
                  </div>
                ))
              : [
                  { day: "Day 2", label: "First check-in" },
                  { day: "Day 5", label: "A helpful reminder" },
                  { day: "Day 9", label: "One last follow-through" },
                ].map((step, index) => (
                  <div
                    key={step.day}
                    className="flex items-center gap-3 border-b border-border/70 py-3 last:border-0"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-[#edf4ed] text-[0.65rem] font-bold text-[#4c7959]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{step.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {step.day}
                    </span>
                  </div>
                ))}
            <Link
              href="/settings/sequences"
              className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
            >
              Edit sequence
            </Link>
            <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
              Follow-ups pause when you mark a quote accepted, declined, or cancelled.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
