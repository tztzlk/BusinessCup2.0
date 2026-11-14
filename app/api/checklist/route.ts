import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession, upsertChecklistItem } from "@/lib/household";

export const runtime = "nodejs";

const Item = z.object({
  formType: z.string().min(1).max(20),
  source: z.string().min(1).max(200),
  status: z.enum(["expected", "received", "mismatch", "overdue"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

// Replaces the generated checklist (engine.expectedDocs output) item by item.
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const parsed = z.array(Item).max(50).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_checklist", issues: parsed.error.issues }, { status: 400 });
  const ids = parsed.data.map((item) => upsertChecklistItem(s, item));
  return NextResponse.json({ ids }, { status: 201 });
}
