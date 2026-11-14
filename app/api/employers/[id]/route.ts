import { NextResponse } from "next/server";
import { currentSession, updateEmployer } from "@/lib/household";
import { EmploymentSettingsSchema } from "@/lib/validation";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

// Replaces a job's settings (pay, 401(k) match rule, W-4). Only jobs of the caller's household.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req);
  if (!read.ok) return read.response;
  const parsed = EmploymentSettingsSchema.safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_employer", issues: parsed.error.issues }, { status: 400 });
  const { id } = await ctx.params;
  if (!updateEmployer(s, id, parsed.data)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
