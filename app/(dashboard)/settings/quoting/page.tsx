import { redirect } from "next/navigation";

/** Moved into Settings; kept so old links still work. */
export default function QuotingSettingsRedirect() {
  redirect("/settings#quotes");
}
