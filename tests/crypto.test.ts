import { beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

vi.mock("server-only", () => ({}));

let c: typeof import("../lib/crypto");

beforeAll(async () => {
  process.env.MASTER_KEY = randomBytes(32).toString("base64");
  c = await import("../lib/crypto");
});

describe("field encryption", () => {
  it("round-trips with the right key and AAD", () => {
    const secret = c.newHouseholdSecret();
    const key = c.deriveKey(secret, "hh_1");
    const aad = c.aadFor("documents", "doc_1", "hh_1");
    const blob = c.encryptJson(key, { gross: 3653.85 }, aad);
    expect(c.decryptJson(key, blob, aad)).toEqual({ gross: 3653.85 });
  });

  it("fails with another household's secret", () => {
    const key = c.deriveKey(c.newHouseholdSecret(), "hh_1");
    const other = c.deriveKey(c.newHouseholdSecret(), "hh_1");
    const aad = c.aadFor("documents", "doc_1", "hh_1");
    const blob = c.encryptJson(key, { a: 1 }, aad);
    expect(() => c.decryptJson(other, blob, aad)).toThrow();
  });

  it("fails when the blob is moved to another row", () => {
    const key = c.deriveKey(c.newHouseholdSecret(), "hh_1");
    const blob = c.encryptJson(key, { a: 1 }, c.aadFor("documents", "doc_1", "hh_1"));
    expect(() => c.decryptJson(key, blob, c.aadFor("documents", "doc_2", "hh_1"))).toThrow();
  });

  it("fails when the ciphertext is tampered with", () => {
    const key = c.deriveKey(c.newHouseholdSecret(), "hh_1");
    const aad = c.aadFor("households", "hh_1", "hh_1");
    const blob = c.encryptJson(key, { a: 1 }, aad);
    blob[20] ^= 0xff;
    expect(() => c.decryptJson(key, blob, aad)).toThrow();
  });

  it("uses a fresh nonce for every write", () => {
    const key = c.deriveKey(c.newHouseholdSecret(), "hh_1");
    const aad = c.aadFor("households", "hh_1", "hh_1");
    const a = c.encryptJson(key, { a: 1 }, aad);
    const b = c.encryptJson(key, { a: 1 }, aad);
    expect(a.equals(b)).toBe(false);
  });

  it("stores only a hash of the secret", () => {
    const secret = c.newHouseholdSecret();
    expect(c.hashToken(secret)).toMatch(/^[0-9a-f]{64}$/);
    expect(c.hashToken(secret)).not.toContain(secret);
  });
});
