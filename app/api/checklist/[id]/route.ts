import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession, setChecklistStatus } from "@/lib/household";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({ status: z.enum(["expected", "received", "mismatch", "overdue"]) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req, 4 * 1024);
  if (!read.ok) return read.response;
  const parsed = Body.safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  const { id } = await ctx.params;
  if (!setChecklistStatus(s, id, parsed.data.status)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
