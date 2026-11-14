import { NextResponse } from "next/server";
import { currentSession, deleteDocument } from "@/lib/household";

export const runtime = "nodejs";

// Deletes one saved document of the caller's household. On the free plan this frees the pay stub slot.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await deleteDocument(s, id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
