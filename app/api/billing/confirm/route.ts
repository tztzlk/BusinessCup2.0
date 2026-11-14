import { NextResponse } from "next/server";
import { z } from "zod";
import { BillingError, confirmCheckout } from "@/lib/billing";
import { audit } from "@/lib/db";
import { clientIpHash, currentSession } from "@/lib/household";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/) });

// Called by /billing/success after Stripe redirects back. Verifies the session with Stripe
// before unlocking: the client is never trusted to say "I paid".
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req, 4 * 1024);
  if (!read.ok) return read.response;
  const parsed = Body.safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  try {
    const plan = await confirmCheckout(s.householdId, parsed.data.sessionId);
    audit(s.householdId, "upgrade_annual", await clientIpHash());
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof BillingError) return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    console.error("confirm: unexpected error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
