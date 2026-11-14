import "server-only";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { aadFor, decryptJson, deriveKey, encryptJson, hashIp, hashToken, newHouseholdSecret } from "./crypto";
import { audit, getDb } from "./db";
import { planFor } from "./billing";
import type {
  ChecklistItem,
  ChecklistStatus,
  EmploymentSettings,
  HouseholdData,
  HouseholdProfile,
  Paystub,
  StoredDocument,
  W2,
} from "./types";

export const COOKIE_NAME = "pt_hh";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, same as inactivity cleanup

export const DEFAULT_PROFILE: HouseholdProfile = {
  filingStatus: "single",
  state: "TX",
  dependentsUnder17: 0,
  otherDependents: 0,
  flags: { mortgage: false, bankInterest: false, brokerage: false, hsa: false },
};

export interface Session {
  householdId: string;
  key: Buffer;
}

const now = () => new Date().toISOString();

export async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("fly-client-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return hashIp(ip);
}

export async function setSessionCookie(secret: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export function sessionFromSecret(secret: string): Session | null {
  const row = getDb()
    .prepare("SELECT id FROM households WHERE token_hash = ?")
    .get(hashToken(secret)) as { id: string } | undefined;
  if (!row) return null;
  getDb().prepare("UPDATE households SET last_seen_at = ? WHERE id = ?").run(now(), row.id);
  return { householdId: row.id, key: deriveKey(secret, row.id) };
}

export async function currentSession(): Promise<Session | null> {
  const secret = (await cookies()).get(COOKIE_NAME)?.value;
  if (!secret) return null;
  try {
    return sessionFromSecret(secret);
  } catch {
    return null;
  }
}

export async function createHousehold(profile: HouseholdProfile = DEFAULT_PROFILE): Promise<{ id: string; secret: string }> {
  const id = randomUUID();
  const secret = newHouseholdSecret();
  const key = deriveKey(secret, id);
  const ts = now();
  getDb()
    .prepare("INSERT INTO households (id, token_hash, enc_profile, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, hashToken(secret), encryptJson(key, profile, aadFor("households", id, id)), ts, ts);
  audit(id, "create", await clientIpHash());
  return { id, secret };
}

export function saveProfile(s: Session, profile: HouseholdProfile): void {
  getDb()
    .prepare("UPDATE households SET enc_profile = ? WHERE id = ?")
    .run(encryptJson(s.key, profile, aadFor("households", s.householdId, s.householdId)), s.householdId);
}

export function addEmployer(s: Session, settings: Omit<EmploymentSettings, "id">): string {
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO employers (id, household_id, member, enc_settings, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, s.householdId, settings.member, encryptJson(s.key, settings, aadFor("employers", id, s.householdId)), now());
  return id;
}

export async function addDocument(
  s: Session,
  doc: { employerId: string | null; docType: "paystub" | "w2"; taxYear: number; fields: Paystub | W2 },
): Promise<string> {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO documents (id, household_id, employer_id, doc_type, tax_year, enc_fields, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      s.householdId,
      doc.employerId,
      doc.docType,
      doc.taxYear,
      encryptJson(s.key, doc.fields, aadFor("documents", id, s.householdId)),
      now(),
    );
  audit(s.householdId, "add_document", await clientIpHash());
  return id;
}

export function upsertChecklistItem(s: Session, item: Omit<ChecklistItem, "id"> & { id?: string }): string {
  const id = item.id ?? randomUUID();
  getDb()
    .prepare(
      `INSERT INTO checklist_items (id, household_id, form_type, enc_source, status, due_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, due_date = excluded.due_date, updated_at = excluded.updated_at
       WHERE checklist_items.household_id = excluded.household_id`,
    )
    .run(
      id,
      s.householdId,
      item.formType,
      encryptJson(s.key, item.source, aadFor("checklist_items", id, s.householdId)),
      item.status,
      item.dueDate,
      now(),
    );
  return id;
}

export function setChecklistStatus(s: Session, id: string, status: ChecklistStatus): boolean {
  const res = getDb()
    .prepare("UPDATE checklist_items SET status = ?, updated_at = ? WHERE id = ? AND household_id = ?")
    .run(status, now(), id, s.householdId);
  return res.changes === 1;
}

export async function loadHouseholdData(s: Session): Promise<HouseholdData> {
  const db = getDb();
  const h = db.prepare("SELECT enc_profile FROM households WHERE id = ?").get(s.householdId) as { enc_profile: Buffer };
  const profile = decryptJson<HouseholdProfile>(s.key, h.enc_profile, aadFor("households", s.householdId, s.householdId));

  const employers = (
    db.prepare("SELECT id, enc_settings FROM employers WHERE household_id = ? ORDER BY created_at").all(s.householdId) as Array<{
      id: string;
      enc_settings: Buffer;
    }>
  ).map((r) => ({
    ...decryptJson<Omit<EmploymentSettings, "id">>(s.key, r.enc_settings, aadFor("employers", r.id, s.householdId)),
    id: r.id,
  }));

  const documents: StoredDocument[] = (
    db
      .prepare(
        "SELECT id, employer_id, doc_type, tax_year, enc_fields, created_at FROM documents WHERE household_id = ? ORDER BY created_at",
      )
      .all(s.householdId) as Array<{
      id: string;
      employer_id: string | null;
      doc_type: "paystub" | "w2";
      tax_year: number;
      enc_fields: Buffer;
      created_at: string;
    }>
  ).map((r) => ({
    id: r.id,
    employerId: r.employer_id,
    docType: r.doc_type,
    taxYear: r.tax_year,
    fields: decryptJson<Paystub | W2>(s.key, r.enc_fields, aadFor("documents", r.id, s.householdId)),
    createdAt: r.created_at,
  }));

  const checklist: ChecklistItem[] = (
    db
      .prepare("SELECT id, form_type, enc_source, status, due_date FROM checklist_items WHERE household_id = ? ORDER BY due_date, form_type")
      .all(s.householdId) as Array<{ id: string; form_type: string; enc_source: Buffer; status: ChecklistStatus; due_date: string | null }>
  ).map((r) => ({
    id: r.id,
    formType: r.form_type,
    source: decryptJson<string>(s.key, r.enc_source, aadFor("checklist_items", r.id, s.householdId)),
    status: r.status,
    dueDate: r.due_date,
  }));

  audit(s.householdId, "read", await clientIpHash());
  return { profile, employers, documents, checklist, plan: planFor(s.householdId) };
}

export async function deleteHousehold(s: Session): Promise<void> {
  getDb().prepare("DELETE FROM households WHERE id = ?").run(s.householdId);
  audit(s.householdId, "delete_household", await clientIpHash());
}

// Inactive households are removed after 30 days.
export function purgeInactive(): number {
  const cutoff = new Date(Date.now() - COOKIE_MAX_AGE * 1000).toISOString();
  const res = getDb().prepare("DELETE FROM households WHERE last_seen_at < ?").run(cutoff);
  if (res.changes > 0) audit(null, `purge_inactive:${res.changes}`, null);
  return res.changes;
}
