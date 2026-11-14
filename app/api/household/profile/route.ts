import { NextResponse } from "next/server";
import { currentSession, saveProfile } from "@/lib/household";
import { HouseholdProfileSchema } from "@/lib/validation";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req);
  if (!read.ok) return read.response;
  const parsed = HouseholdProfileSchema.safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_profile", issues: parsed.error.issues }, { status: 400 });
  saveProfile(s, parsed.data);
  return NextResponse.json({ ok: true });
}
