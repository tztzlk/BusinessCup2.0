import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { readBytes, readJson } from "../lib/http";
import { middleware } from "../middleware";

const jsonReq = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    // Required by undici for streaming bodies.
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  } as RequestInit);

describe("readJson", () => {
  it("parses a JSON body", async () => {
    const r = await readJson(jsonReq(JSON.stringify({ a: 1 })));
    expect(r).toEqual({ ok: true, value: { a: 1 } });
  });

  it("returns null for invalid JSON so the schema check answers 400", async () => {
    const r = await readJson(jsonReq("{not json"));
    expect(r).toEqual({ ok: true, value: null });
  });

  it("rejects non-JSON content types with 415 (cross-site forms send text/plain)", async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: '{"secret":"x","pad":"="}',
    });
    const r = await readJson(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(415);
  });

  it("rejects a declared oversize body with 413 before reading it", async () => {
    const r = await readJson(jsonReq("{}", { "content-length": String(10 * 1024 * 1024) }), 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  it("rejects a chunked body once it passes the limit", async () => {
    const chunk = new TextEncoder().encode("x".repeat(1024));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent++ >= 100) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const r = await readBytes(jsonReq(stream), 8 * 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
    expect(sent).toBeLessThan(20);
  });
});

describe("middleware (CSRF)", () => {
  const call = (method: string, headers: Record<string, string>) =>
    middleware(new NextRequest("http://paytrail.test/api/household/recover", { method, headers }));

  it("blocks a cross-site POST", () => {
    expect(call("POST", { host: "paytrail.test", "sec-fetch-site": "cross-site" }).status).toBe(403);
  });

  it("blocks a POST whose Origin is another host", () => {
    expect(call("POST", { host: "paytrail.test", origin: "https://evil.example" }).status).toBe(403);
  });

  it("allows a same-origin POST behind the proxy", () => {
    const res = call("POST", {
      host: "0.0.0.0:3000",
      "x-forwarded-host": "paytrail.test",
      origin: "https://paytrail.test",
      "sec-fetch-site": "same-origin",
    });
    expect(res.status).toBe(200);
  });

  it("allows GET from anywhere", () => {
    expect(call("GET", { host: "paytrail.test", "sec-fetch-site": "cross-site" }).status).toBe(200);
  });
});
