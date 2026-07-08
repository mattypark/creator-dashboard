import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Single-user password gate. Only enforced when APP_PASSWORD is set, so the
 * local keyless demo stays open. Cron routes carry their own CRON_SECRET and
 * are exempt from the cookie check.
 */
const OPEN_PAGES = ["/login"];
const OPEN_API = ["/api/login", "/api/cron", "/api/agent"];

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next(); // demo mode: no gate

  const { pathname } = req.nextUrl;
  if (
    OPEN_PAGES.includes(pathname) ||
    OPEN_API.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("cd_auth")?.value;
  if (cookie === password) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
