import "server-only";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

// Field-level encryption for household data.
// DEK = HKDF-SHA256(household_secret ‖ MASTER_KEY, salt = household_id, info = "paytrail-dek-v1")
// Blob layout: version(1) ‖ nonce(12) ‖ ciphertext ‖ tag(16), AES-256-GCM.
// AAD binds a blob to its table, row and household, so it cannot be moved to another row.

const VERSION = 1;
const NONCE_LEN = 12;
const TAG_LEN = 16;

function masterKey(): Buffer {
  const raw = process.env.MASTER_KEY;
  if (!raw) throw new Error("MASTER_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("MASTER_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function newHouseholdSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function deriveKey(secret: string, householdId: string): Buffer {
  const secretBytes = Buffer.from(secret, "base64url");
  if (secretBytes.length !== 32) throw new Error("invalid household secret");
  const ikm = Buffer.concat([secretBytes, masterKey()]);
  return Buffer.from(hkdfSync("sha256", ikm, householdId, "paytrail-dek-v1", 32));
}

export function aadFor(table: string, rowId: string, householdId: string): string {
  return `${table}:${rowId}:${householdId}`;
}

export function encryptJson(key: Buffer, value: unknown, aad: string): Buffer {
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), nonce, ciphertext, cipher.getAuthTag()]);
}

export function decryptJson<T>(key: Buffer, blob: Buffer, aad: string): T {
  if (blob.length < 1 + NONCE_LEN + TAG_LEN || blob[0] !== VERSION) {
    throw new Error("unsupported ciphertext");
  }
  const nonce = blob.subarray(1, 1 + NONCE_LEN);
  const tag = blob.subarray(blob.length - TAG_LEN);
  const ciphertext = blob.subarray(1 + NONCE_LEN, blob.length - TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}:${process.env.MASTER_KEY ?? ""}`).digest("hex").slice(0, 32);
}
