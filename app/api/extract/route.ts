import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ACCEPTED_TYPES, type AcceptedType, extractDocument, ExtractionError } from "@/lib/extraction";
import { clientIpHash } from "@/lib/household";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

// Reads a pay stub or W-2 and returns its fields for the confirmation screen.
// The file stays in memory for the duration of this request and is never stored.
export async function POST(req: Request) {
  const ip = (await clientIpHash()) ?? "unknown";
  if (!allow(`extract:${ip}`, 15, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many uploads. Try again in a few minutes." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "bad_size", message: "File must be under 10 MB." }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
    return NextResponse.json(
      { error: "bad_type", message: "Upload a PDF, JPG, PNG or WebP. iPhone HEIC photos: export as JPG first." },
      { status: 415 },
    );
  }

  const data = Buffer.from(await file.arrayBuffer());
  try {
    return NextResponse.json(await extractDocument(data, file.type as AcceptedType));
  } catch (err) {
    if (err instanceof ExtractionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 422 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "busy", message: "Our reader is busy. Try again in a minute." }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("extract: Claude API error", err.status, err.message);
      return NextResponse.json({ error: "upstream", message: "Could not read the document right now." }, { status: 502 });
    }
    console.error("extract: unexpected error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  } finally {
    data.fill(0);
  }
}
