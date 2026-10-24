import { destroySession } from "@/lib/auth/session";
import { redirectToPath } from "@/lib/http";

export async function POST() {
  await destroySession();
  return redirectToPath("/login", 303);
}
