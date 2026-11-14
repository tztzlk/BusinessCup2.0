import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";

// Routes import through the "@/" alias, which vitest does not resolve here: map each alias to the
// real module, and replace only the Anthropic client with a stub. No network calls are made.
const h = vi.hoisted(() => ({ create: vi.fn(), ip: 0 }));

vi.mock("server-only", () => ({}));
vi.mock("../lib/claude", async (importActual) => {
  const actual = await importActual<typeof import("../lib/claude")>();
  return {
    ...actual,
    claude: () => (process.env.ANTHROPIC_API_KEY ? { beta: { messages: { create: h.create } } } : actual.claude()),
  };
});
vi.mock("@/lib/claude", async () => await import("../lib/claude"));
vi.mock("@/lib/extraction", async () => await import("../lib/extraction"));
vi.mock("@/lib/http", async () => await import("../lib/http"));
vi.mock("@/lib/ratelimit", async () => await import("../lib/ratelimit"));
// A fresh client per request keeps the per-IP limits out of the way.
vi.mock("@/lib/household", () => ({ clientIpHash: async () => `ip-${h.ip++}`, currentSession: async () => null }));

import Anthropic from "@anthropic-ai/sdk";
import { POST as extract } from "../app/api/extract/route";
import { POST as explain } from "../app/api/explain/route";
import { countPdfPages, sniffType } from "../lib/extraction";
import { allowClaudeCall, readStructuredOutput } from "../lib/claude";

const enc = (s: string) => new TextEncoder().encode(s);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const HEIC = new Uint8Array([0, 0, 0, 0x18, ...enc("ftypheic"), 0, 0, 0, 0]);

function pdf(pages: number, withTree = true): Uint8Array {
  const objs = Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj << /Type /Page /Parent 2 0 R >> endobj\n`).join("");
  const tree = withTree ? `2 0 obj << /Type /Pages /Kids [3 0 R] /Count ${pages} >> endobj\n` : "";
  return enc(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n${tree}${objs}%%EOF\n`);
}

function message(content: unknown[], stop_reason = "end_turn"): BetaMessage {
  return { stop_reason, content } as unknown as BetaMessage;
}
const text = (t: string) => ({ type: "text", text: t });
const OTHER = JSON.stringify({ documentType: "other", paystub: null, w2: null, uncertainFields: [] });

function upload(bytes: Uint8Array | Blob, type = "image/jpeg"): Request {
  const form = new FormData();
  form.set("file", bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type }), "stub");
  return new Request("http://localhost/api/extract", { method: "POST", body: form });
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  h.create.mockReset();
});
afterEach(() => {
  delete process.env.CLAUDE_HOURLY_CAP;
});

describe("file checks", () => {
  it("detects types by magic bytes", () => {
    expect(sniffType(JPEG)).toBe("image/jpeg");
    expect(sniffType(PNG)).toBe("image/png");
    expect(sniffType(enc("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffType(enc("GIF89a...."))).toBe("image/gif");
    expect(sniffType(pdf(1))).toBe("application/pdf");
    expect(sniffType(HEIC)).toBe("heic");
    expect(sniffType(enc("hello world"))).toBeNull();
    expect(sniffType(new Uint8Array(0))).toBeNull();
  });

  it("counts PDF pages from the page tree, else from page objects, else unknown", () => {
    expect(countPdfPages(pdf(2))).toBe(2);
    expect(countPdfPages(pdf(7))).toBe(7);
    expect(countPdfPages(pdf(6, false))).toBe(6);
    expect(countPdfPages(enc("%PDF-1.7\n<< /Type /ObjStm /N 3 >> stream ... %%EOF"))).toBe(0);
  });
});

describe("readStructuredOutput", () => {
  it("maps stop reasons and bad JSON to clean failures", () => {
    expect(readStructuredOutput(message([text('{"a":')], "max_tokens"))).toEqual({ ok: false, reason: "truncated" });
    expect(readStructuredOutput(message([text('{"a":')], "refusal"))).toEqual({ ok: false, reason: "refused" });
    expect(readStructuredOutput(message([text("not json")]))).toEqual({ ok: false, reason: "unreadable" });
    expect(readStructuredOutput(message([]))).toEqual({ ok: false, reason: "unreadable" });
  });

  it("ignores a declined model's partial text before the fallback block", () => {
    const m = message([text('{"partial'), { type: "fallback", from: { model: "a" }, to: { model: "b" } }, text('{"a":1}')]);
    expect(readStructuredOutput(m)).toEqual({ ok: true, json: { a: 1 } });
  });
});

describe("POST /api/extract", () => {
  it("rejects an oversized upload with 413 without buffering it all", async () => {
    const res = await extract(upload(new Blob([new Uint8Array(12 * 1024 * 1024)], { type: "application/pdf" })));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe("bad_size");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("rejects HEIC and unknown bytes whatever the declared type", async () => {
    for (const bytes of [HEIC, enc("MZ not an image")]) {
      const res = await extract(upload(bytes, "image/jpeg"));
      expect(res.status).toBe(415);
      expect((await res.json()).error).toBe("bad_type");
    }
    expect(h.create).not.toHaveBeenCalled();
  });

  it("sends the detected type, not the declared one", async () => {
    h.create.mockResolvedValue(message([text(OTHER)]));
    const res = await extract(upload(PNG, "image/jpeg"));
    expect(res.status).toBe(200);
    expect((await res.json()).documentType).toBe("other");
    const params = h.create.mock.calls[0][0];
    expect(params.messages[0].content[0].source.media_type).toBe("image/png");
    expect(params.fallbacks).toBe("default");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
  });

  it("caps images below Claude's 10 MB base64 limit", async () => {
    const big = new Uint8Array(8 * 1024 * 1024);
    big.set(JPEG);
    const res = await extract(upload(big));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe("image_too_large");
  });

  it("rejects PDFs over 5 pages before calling Claude, allows unknown counts", async () => {
    const res = await extract(upload(pdf(7), "application/pdf"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("too_many_pages");
    expect(h.create).not.toHaveBeenCalled();

    h.create.mockResolvedValue(message([text(OTHER)]));
    expect((await extract(upload(enc("%PDF-1.7\n<< /Type /ObjStm >>"), "application/pdf"))).status).toBe(200);
    expect(h.create.mock.calls[0][0].messages[0].content[0].type).toBe("document");
  });

  it.each([
    ["max_tokens", [text('{"documentType":"payst')], "truncated"],
    ["refusal", [text('{"documentType":')], "refused"],
    ["end_turn", [text('{"documentType":"invoice"}')], "unreadable"],
    ["end_turn", [text("{oops")], "unreadable"],
  ])("maps stop_reason %s to 422 %s", async (stop, content, code) => {
    h.create.mockResolvedValue(message(content, stop));
    const res = await extract(upload(JPEG));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(code);
  });

  it("maps a 400 from Claude to 422 unreadable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.create.mockRejectedValue(Anthropic.APIError.generate(400, { error: { type: "invalid_request_error", message: "bad pdf" } }, "bad pdf", new Headers()));
    const res = await extract(upload(pdf(1), "application/pdf"));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("unreadable");
  });

  it("answers 503 upstream when the API key is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.ANTHROPIC_API_KEY;
    const res = await extract(upload(JPEG));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("upstream");
  });

  it("stops calling Claude once the global hourly cap is reached", async () => {
    process.env.CLAUDE_HOURLY_CAP = "1";
    allowClaudeCall();
    allowClaudeCall();
    const res = await extract(upload(JPEG));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("busy");
    expect(h.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/explain", () => {
  const finding = (inputs: Record<string, number>) => ({
    id: "f0",
    code: "MATCH_LEFT_ON_TABLE",
    severity: "warning",
    amountUsd: 475,
    actionKind: "contribution_change",
    inputs,
  });
  const call = (body: unknown, type = "application/json") =>
    explain(
      new Request("http://localhost/api/explain", {
        method: "POST",
        headers: { "content-type": type },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  const OUT = JSON.stringify({ summary: "All good.", items: [{ id: "f0", code: "MATCH_LEFT_ON_TABLE", title: "t", body: "b" }] });

  it("bounds the body, the input keys and the tax year", async () => {
    expect((await call("x".repeat(40 * 1024))).status).toBe(413);
    expect((await call({ findings: [], projection: null }, "text/plain")).status).toBe(415);
    const many = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`k${i}`, i]));
    expect((await call({ findings: [finding(many)], projection: null })).status).toBe(400);
    expect((await call({ findings: [finding({ a: 1 })], projection: { balance: 1, taxYear: 1999 } })).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns parsed text, skipping partial output before a fallback", async () => {
    h.create.mockResolvedValue(message([text('{"summ'), { type: "fallback", from: { model: "a" }, to: { model: "b" } }, text(OUT)]));
    const res = await call({ findings: [finding({ a: 1 })], projection: { balance: 100, taxYear: 2026 } });
    expect(res.status).toBe(200);
    expect((await res.json()).summary).toBe("All good.");
  });

  it("answers 422 no_explanation instead of 500 on truncated or invalid output", async () => {
    for (const m of [message([text('{"summary":"x')], "max_tokens"), message([text('{"summary":1}')])]) {
      h.create.mockResolvedValue(m);
      const res = await call({ findings: [finding({ a: 1 })], projection: null });
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBe("no_explanation");
    }
  });
});
