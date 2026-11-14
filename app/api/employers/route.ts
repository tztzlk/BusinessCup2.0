import { NextResponse } from "next/server";
import { addEmployer, countEmployers, currentSession, MAX_EMPLOYERS } from "@/lib/household";
import { EmploymentSettingsSchema } from "@/lib/validation";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "no_household" }, { status: 401 });
  const read = await readJson(req);
  if (!read.ok) return read.response;
  const parsed = EmploymentSettingsSchema.safeParse(read.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_employer", issues: parsed.error.issues }, { status: 400 });
  if (countEmployers(s) >= MAX_EMPLOYERS) {
    return NextResponse.json(
      { error: "too_many_employers", message: `A household can have up to ${MAX_EMPLOYERS} jobs.` },
      { status: 400 },
    );
  }
  return NextResponse.json({ id: addEmployer(s, parsed.data) }, { status: 201 });
}
