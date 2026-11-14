import { NextResponse } from "next/server";
import { BillingError, createCheckout } from "@/lib/billing";
import { currentSession } from "@/lib/household";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

// Starts Stripe Checkout for the Annual plan. The browser is redirected to the returned URL.
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  try {
    return NextResponse.json({ url: await createCheckout(s.householdId, publicOrigin(req)) });
  } catch (err) {
    if (err instanceof BillingError) return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    console.error("checkout: unexpected error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
