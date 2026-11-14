import { NextResponse } from "next/server";
import {
  addDocument,
  countDocuments,
  currentSession,
  employerIdsWhere,
  hasDuplicateDocument,
  ownsEmployer,
} from "@/lib/household";
import { isSampleEmployer } from "@/lib/sample";
import { readJson } from "@/lib/http";
import { AddDocumentSchema } from "@/lib/validation";
import { planFor } from "@/lib/billing";
import { FREE_LIMITS } from "@/lib/plan";

export const runtime = "nodejs";

// Saves fields the user has confirmed. The original file is never stored.
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req);
  if (!read.ok) return read.response;
  const parsed = AddDocumentSchema.safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_document", issues: parsed.error.issues }, { status: 400 });
  if (parsed.data.employerId && !ownsEmployer(s, parsed.data.employerId)) {
    return NextResponse.json({ error: "unknown_employer" }, { status: 400 });
  }
  if (hasDuplicateDocument(s, parsed.data)) {
    return NextResponse.json(
      {
        error: "duplicate_document",
        message:
          parsed.data.docType === "paystub"
            ? "This pay stub is already saved for this job (same pay date)."
            : "A W-2 for this job and year is already saved.",
      },
      { status: 409 },
    );
  }

  // Free plan: one pay stub, no W-2s. Annual unlocks every stub for both earners and tax season.
  // The sample job's stubs don't count, so trying the sample never uses up the free stub.
  const sampleIds = employerIdsWhere(s, isSampleEmployer);
  const isSample = parsed.data.employerId !== null && sampleIds.has(parsed.data.employerId);
  if (!isSample && planFor(s.householdId).tier === "free") {
    const count = countDocuments(s, parsed.data.docType, sampleIds);
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
