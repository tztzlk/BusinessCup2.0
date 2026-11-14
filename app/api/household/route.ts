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
  const origin = new URL(req.url).origin;
  return NextResponse.json({ householdId: id, recoveryUrl: `${origin}/recover#${secret}` }, { status: 201 });
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
