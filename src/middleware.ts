import { NextResponse, type NextRequest } from "next/server";
import { decideBasicAuth } from "@/lib/basic-auth";

/**
 * HTTP Basic Auth for the admin (/admin pages, their server-action POSTs, and /api/admin/*).
 * Credentials come from ADMIN_USER and ADMIN_PASSWORD. Unset in development → open;
 * unset anywhere else → 503 (fail closed). /api/cron/generate is not matched here: it
 * stays on CRON_SECRET.
 */
export function middleware(req: NextRequest) {
  const decision = decideBasicAuth({
    header: req.headers.get("authorization"),
    user: process.env.ADMIN_USER,
    password: process.env.ADMIN_PASSWORD,
    nodeEnv: process.env.NODE_ENV,
  });
  if (decision === "allow") return NextResponse.next();
  if (decision === "not-configured") {
    return new NextResponse("Admin login is not configured (set ADMIN_USER and ADMIN_PASSWORD).", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Thea admin", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
