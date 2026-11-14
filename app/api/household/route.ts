import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  createHousehold,
  currentSession,
  DEFAULT_PROFILE,
  deleteHousehold,
  loadHouseholdData,
  setSessionCookie,
} from "@/lib/household";
import { HouseholdProfileSchema } from "@/lib/validation";

export const runtime = "nodejs";

// Create a household for the visitor. The secret goes to an httpOnly cookie and is
// returned once as a recovery link; the server keeps only its hash.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = HouseholdProfileSchema.safeParse(body?.profile ?? DEFAULT_PROFILE);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_profile", issues: parsed.error.issues }, { status: 400 });
  }
  const { id, secret } = await createHousehold(parsed.data);
  await setSessionCookie(secret);
  return NextResponse.json({ householdId: id, recoveryUrl: `${publicOrigin(req)}/recover#${secret}` }, { status: 201 });
}

// Behind the Fly proxy req.url carries the container's bind address (0.0.0.0:3000), so the public
// origin comes from the forwarded host. The client also rebuilds the link from its own location.
function publicOrigin(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  return NextResponse.json(await loadHouseholdData(s));
}

export async function DELETE() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  await deleteHousehold(s);
  await clearSessionCookie();
  return NextResponse.json({ deleted: true });
}
