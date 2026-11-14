import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { allowRequest } = await import("../lib/ratelimit");

describe("rate limits for a room on one IP", () => {
  afterEach(() => {
    delete process.env.RATE_EXTRACT_PER_IP;
    delete process.env.RATE_EXTRACT_PER_VISITOR;
  });

  it("a household that used its budget doesn't block the next household on the same IP", () => {
    for (let i = 0; i < 15; i++) expect(allowRequest("extract", "ip-room", "hh-a")).toBe(true);
    expect(allowRequest("extract", "ip-room", "hh-a")).toBe(false);
    expect(allowRequest("extract", "ip-room", "hh-b")).toBe(true);
  });

  it("the IP ceiling still stops many households from one address", () => {
    let allowed = 0;
    for (let i = 0; i < 200; i++) if (allowRequest("extract", "ip-flood", `hh-${i}`)) allowed++;
    expect(allowed).toBe(80);
  });

  it("limits can be raised with env vars", () => {
    process.env.RATE_EXTRACT_PER_IP = "3";
    process.env.RATE_EXTRACT_PER_VISITOR = "100";
    const results = Array.from({ length: 5 }, () => allowRequest("extract", "ip-env", "hh-env"));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("household creation has an IP ceiling only", () => {
    let allowed = 0;
    for (let i = 0; i < 130; i++) if (allowRequest("household", "ip-new", null)) allowed++;
    expect(allowed).toBe(120);
  });
});
