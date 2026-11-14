import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionFromSecret, setSessionCookie } from "@/lib/household";

export const runtime = "nodejs";

// The recovery link carries the secret in the URL fragment (#...), which browsers never
// send to the server. The /recover page reads it and posts it here to restore the cookie.
const Body = z.object({ secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_secret" }, { status: 400 });
  const session = sessionFromSecret(parsed.data.secret);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await setSessionCookie(parsed.data.secret);
  return NextResponse.json({ restored: true });
}
