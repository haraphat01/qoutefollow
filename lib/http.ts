import { NextResponse } from "next/server";

/**
 * Redirect to a path on this same site. Behind a reverse proxy (Coolify)
 * request.url carries the container's internal address (localhost:3000), so
 * build relative Location headers instead of absolute ones from it.
 */
export function redirectToPath(path: string, status: 302 | 303 | 307 = 307) {
  return new NextResponse(null, { status, headers: { Location: path } });
}
