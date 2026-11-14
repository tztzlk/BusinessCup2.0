import { NextResponse } from "next/server";
import { currentSession, saveProfile } from "@/lib/household";
import { HouseholdProfileSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const parsed = HouseholdProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_profile", issues: parsed.error.issues }, { status: 400 });
  saveProfile(s, parsed.data);
  return NextResponse.json({ ok: true });
}
