import { NextResponse } from "next/server";

// Request bodies are read through these helpers so no route buffers an unbounded body.
// The Content-Length check rejects honest oversize requests early; the streaming counter
// covers chunked requests that send no length.

export const JSON_BODY_LIMIT = 256 * 1024;

export type BodyResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

const tooLarge = (): BodyResult<never> => ({
  ok: false,
  response: NextResponse.json({ error: "too_large", message: "Request body is too large." }, { status: 413 }),
});

/** Reads the raw body, failing with 413 once it exceeds `maxBytes`. */
export async function readBytes(req: Request, maxBytes: number): Promise<BodyResult<Uint8Array<ArrayBuffer>>> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();
  if (!req.body) return { ok: true, value: new Uint8Array(0) };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return tooLarge();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, value: out };
}

/**
 * Reads a JSON body. Requires `Content-Type: application/json`, which a cross-site HTML form
 * cannot send (it would need a CORS preflight). Invalid JSON yields `value: null`, so the
 * route's schema check answers 400 as before.
 */
export async function readJson(req: Request, maxBytes = JSON_BODY_LIMIT): Promise<BodyResult<unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unsupported_media_type", message: "Send JSON." }, { status: 415 }),
    };
  }
  const bytes = await readBytes(req, maxBytes);
  if (!bytes.ok) return bytes;
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes.value)) };
  } catch {
    return { ok: true, value: null };
  }
}
