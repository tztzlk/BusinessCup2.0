import { NextResponse } from "next/server";
import { addEmployer, currentSession } from "@/lib/household";
import { EmploymentSettingsSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const parsed = EmploymentSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_employer", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ id: addEmployer(s, parsed.data) }, { status: 201 });
}
