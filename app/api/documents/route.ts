import { NextResponse } from "next/server";
import { addDocument, currentSession } from "@/lib/household";
import { AddDocumentSchema } from "@/lib/validation";
import { planFor } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { FREE_LIMITS } from "@/lib/plan";

export const runtime = "nodejs";

// Saves fields the user has confirmed. The original file is never stored.
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const parsed = AddDocumentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_document", issues: parsed.error.issues }, { status: 400 });

  // Free plan: one pay stub, no W-2s. Annual unlocks every stub for both earners and tax season.
  if (planFor(s.householdId).tier === "free") {
    const count = (getDb()
      .prepare("SELECT COUNT(*) AS n FROM documents WHERE household_id = ? AND doc_type = ?")
      .get(s.householdId, parsed.data.docType) as { n: number }).n;
    const limit = parsed.data.docType === "paystub" ? FREE_LIMITS.paystubs : FREE_LIMITS.w2s;
    if (count >= limit) {
      return NextResponse.json(
        {
          error: "payment_required",
          message:
            parsed.data.docType === "paystub"
              ? "The free plan includes one pay stub. Unlock Annual to add every pay stub for both earners."
              : "W-2 reconciliation is part of Annual. Unlock it to add your W-2s.",
        },
        { status: 402 },
      );
    }
  }
  return NextResponse.json({ id: await addDocument(s, parsed.data) }, { status: 201 });
}
