import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession, upsertChecklistItem } from "@/lib/household";
import { readJson } from "@/lib/http";
import { isoDate } from "@/lib/validation";

export const runtime = "nodejs";

const Item = z.object({
  formType: z.string().min(1).max(20),
  source: z.string().min(1).max(200),
  status: z.enum(["expected", "received", "mismatch", "overdue"]),
  dueDate: isoDate.nullable(),
});

// Adds checklist items (engine.expectedDocs output). The client dedupes by form type.
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req);
  if (!read.ok) return read.response;
  const parsed = z.array(Item).max(50).safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_checklist", issues: parsed.error.issues }, { status: 400 });
  const ids = parsed.data.map((item) => upsertChecklistItem(s, item));
  return NextResponse.json({ ids }, { status: 201 });
}
