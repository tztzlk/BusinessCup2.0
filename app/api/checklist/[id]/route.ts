import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession, setChecklistStatus } from "@/lib/household";

export const runtime = "nodejs";

const Body = z.object({ status: z.enum(["expected", "received", "mismatch", "overdue"]) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  const { id } = await ctx.params;
  if (!setChecklistStatus(s, id, parsed.data.status)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
