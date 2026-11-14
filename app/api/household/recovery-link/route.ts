import { NextResponse } from "next/server";
import { clientIpHash, currentSecret, currentSession } from "@/lib/household";
import { audit } from "@/lib/db";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

// Shows the recovery link again for the household in this browser's cookie, so a paying user
// can save it before switching devices or clearing cookies.
// A GET is safe: the cookie is SameSite=Strict and, without CORS, no other origin can read the response.
export async function GET(req: Request) {
  const s = await currentSession();
  const secret = await currentSecret();
  if (!s || !secret) {
    return NextResponse.json({ error: "no_household" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  audit(s.householdId, "recovery_link_viewed", await clientIpHash());
  return NextResponse.json(
    { recoveryUrl: `${publicOrigin(req)}/recover#${secret}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
