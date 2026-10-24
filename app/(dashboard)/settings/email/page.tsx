import { redirect } from "next/navigation";

/** Moved into Settings; kept so links in older emails still work. */
export default function EmailSettingsRedirect() {
  redirect("/settings#sending");
}
