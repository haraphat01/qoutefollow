import { processDueFollowUps } from "@/lib/follow-ups/process-due";
import { sendDueWeeklySummaries } from "@/lib/reports/weekly-summary";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await processDueFollowUps();
  const weeklySummaries = await sendDueWeeklySummaries();
  return Response.json({ ok: true, ...result, weeklySummaries });
}
