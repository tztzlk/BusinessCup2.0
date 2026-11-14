import { NextResponse, type NextRequest } from "next/server";

// CSRF guard for the API. Every state-changing request must come from our own pages:
// a cross-site form or fetch could otherwise swap the visitor's household cookie
// (POST /api/household/recover) or spend Claude credits on our behalf.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();

  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return forbidden();

  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      return forbidden();
    }
    if (!host || originHost !== host) return forbidden();
  }
  return NextResponse.next();
}

const forbidden = () => NextResponse.json({ error: "forbidden", message: "Cross-site request blocked." }, { status: 403 });

export const config = { matcher: "/api/:path*" };
