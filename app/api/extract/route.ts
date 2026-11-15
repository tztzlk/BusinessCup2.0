import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { allowClaudeCall, ClaudeNotConfiguredError } from "@/lib/claude";
import {
  countPdfPages,
  extractDocument,
  ExtractionError,
  imageSize,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_SIDE,
  PDF_MAX_BYTES,
  PDF_MAX_PAGES,
  sniffType,
} from "@/lib/extraction";
import { clientIpHash, currentSession } from "@/lib/household";
import { readBytes } from "@/lib/http";
import { allowRequest } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

// Raw body cap: the largest accepted file plus room for the multipart envelope.
const BODY_MAX_BYTES = PDF_MAX_BYTES + 1024 * 1024;

const json = (status: number, error: string, message?: string) =>
  NextResponse.json(message ? { error, message } : { error }, { status });

const badSize = (status = 413) => json(status, "bad_size", "File must be under 10 MB.");
const badType = () => json(415, "bad_type", "Upload a PDF, JPG, PNG or WebP. iPhone HEIC photos: export as JPG first.");

// Reads a pay stub or W-2 and returns its fields for the confirmation screen.
// The file stays in memory for the duration of this request and is never stored.
export async function POST(req: Request) {
  const ip = (await clientIpHash()) ?? "unknown";
  const visitor = (await currentSession().catch(() => null))?.householdId ?? null;
  if (!allowRequest("extract", ip, visitor)) {
    return json(429, "rate_limited", "Too many uploads. Try again in a few minutes.");
  }

  // Bounded read first, so an oversized upload is cut off instead of buffered by formData().
  const body = await readBytes(req, BODY_MAX_BYTES);
  if (!body.ok) return badSize();
  const raw = body.value;

  let data: Buffer | null = null;
  try {
    const form = await new Response(raw, { headers: { "content-type": req.headers.get("content-type") ?? "" } })
      .formData()
      .catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return json(400, "no_file");
    if (file.size === 0) return badSize(400);
    if (file.size > PDF_MAX_BYTES) return badSize();

    data = Buffer.from(await file.arrayBuffer());
    // The declared type is ignored: the request to Claude uses the type found in the bytes.
    const type = sniffType(data);
    if (type === null || type === "heic") return badType();
    if (type !== "application/pdf" && data.length > IMAGE_MAX_BYTES) {
      return json(413, "image_too_large", "This photo is too large to read. Take a new photo of just the document, or upload the PDF.");
    }
    if (type !== "application/pdf") {
      // Claude rejects images over IMAGE_MAX_SIDE px; say so instead of "could not be read".
      const size = imageSize(data, type);
      if (size && Math.max(size.width, size.height) > IMAGE_MAX_SIDE) {
        return json(413, "image_too_large", "This photo is too large to read. Take a new photo of just the document, or upload the PDF.");
      }
    }
    if (type === "application/pdf" && countPdfPages(data) > PDF_MAX_PAGES) {
      // 0 means the count is unknown (e.g. compressed object streams) and the file is allowed.
      return json(400, "too_many_pages", `Upload a single pay stub or W-2 (up to ${PDF_MAX_PAGES} pages).`);
    }

    if (!allowClaudeCall()) return json(503, "busy", "Our document reader is busy. Try again in a minute, or open a sample household under Sample households to see a full report.");

    return NextResponse.json(await extractDocument(data, type));
  } catch (err) {
    if (err instanceof ExtractionError) return json(422, err.code, err.message);
    if (err instanceof ClaudeNotConfiguredError) {
      return json(503, "upstream", "Our document reader is unavailable right now. Try again later, or open a sample household under Sample households to see a full report.");
    }
    if (err instanceof Anthropic.RateLimitError) return json(503, "busy", "Our document reader is busy. Try again in a minute, or open a sample household under Sample households to see a full report.");
    // Out of API credit is also a 400; it is our problem, not the user's document.
    if (err instanceof Anthropic.APIError && /credit balance/i.test(err.message)) {
      console.error("extract: Claude API credit exhausted", err.status);
      return json(503, "upstream", "Our document reader is unavailable right now. Try again later, or open a sample household under Sample households to see a full report.");
    }
    // A 400 from Claude for a file that passed our checks is almost always a corrupt,
    // encrypted or otherwise unreadable document.
    if (err instanceof Anthropic.BadRequestError) {
      console.error("extract: Claude rejected the document", err.status, err.message);
      return json(422, "unreadable", "The document could not be read.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("extract: Claude API error", err.status, err.message);
      return json(502, "upstream", "Our document reader is unavailable right now. Try again later, or open a sample household under Sample households to see a full report.");
    }
    console.error("extract: unexpected error", err);
    return json(500, "internal");
  } finally {
    data?.fill(0);
    raw.fill(0);
  }
}
