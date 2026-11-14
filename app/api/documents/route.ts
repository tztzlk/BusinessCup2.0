import { NextResponse } from "next/server";
import { addDocument, currentSession } from "@/lib/household";
import { AddDocumentSchema } from "@/lib/validation";

export const runtime = "nodejs";

// Saves fields the user has confirmed. The original file is never stored.
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const parsed = AddDocumentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_document", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ id: await addDocument(s, parsed.data) }, { status: 201 });
}
