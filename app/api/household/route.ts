import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  createHousehold,
  currentSession,
  DEFAULT_PROFILE,
  clientIpHash,
  deleteHousehold,
  loadHouseholdData,
  refreshSessionCookie,
  setSessionCookie,
} from "@/lib/household";
import { readJson } from "@/lib/http";
import { allowRequest } from "@/lib/ratelimit";
import { HouseholdProfileSchema } from "@/lib/validation";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

// Create a household for the visitor. The secret goes to an httpOnly cookie and is
// returned once as a recovery link; the server keeps only its hash.
export async function POST(req: Request) {
  const ip = (await clientIpHash()) ?? "unknown";
  if (!allowRequest("household", ip, null)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  const read = await readJson(req);
  if (!read.ok) return read.response;
  const body = read.value as { profile?: unknown } | null;
  const parsed = HouseholdProfileSchema.safeParse(body?.profile ?? DEFAULT_PROFILE);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_profile", issues: parsed.error.issues }, { status: 400 });
  }
  const { id, secret } = await createHousehold(parsed.data);
  await setSessionCookie(secret);
  return NextResponse.json({ householdId: id, recoveryUrl: `${publicOrigin(req)}/recover#${secret}` }, { status: 201 });
}

export async function GET() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const data = await loadHouseholdData(s);
  await refreshSessionCookie();
  return NextResponse.json(data);
}

export async function DELETE() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  await deleteHousehold(s);
  await clearSessionCookie();
  return NextResponse.json({ deleted: true });
}
