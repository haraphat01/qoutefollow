import { Badge } from "@/components/ui/badge";
import type { quotes } from "@/lib/db/schema";

const LABELS: Record<(typeof quotes.$inferSelect)["status"], string> = {
  draft: "Draft",
  pending: "Pending follow-up",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  paused: "Paused",
  expired: "Expired",
};

const VARIANTS: Record<
  (typeof quotes.$inferSelect)["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  pending: "default",
  accepted: "default",
  declined: "destructive",
  cancelled: "outline",
  paused: "secondary",
  expired: "outline",
};

const TONES: Record<(typeof quotes.$inferSelect)["status"], string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  declined: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
  paused: "border-sky-200 bg-sky-50 text-sky-800",
  expired: "border-orange-200 bg-orange-50 text-orange-800",
};

export function QuoteStatusBadge({
  status,
}: {
  status: (typeof quotes.$inferSelect)["status"];
}) {
  return (
    <Badge variant={VARIANTS[status]} className={`h-6 border px-2.5 font-semibold ${TONES[status]}`}>
      {LABELS[status]}
    </Badge>
  );
}
