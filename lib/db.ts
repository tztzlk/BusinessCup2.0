import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Migrations are embedded so they ship inside the standalone build.
// Each entry runs once; progress is tracked with PRAGMA user_version.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE households (
    id            TEXT PRIMARY KEY,
    token_hash    TEXT NOT NULL UNIQUE,
    enc_profile   BLOB NOT NULL,
    created_at    TEXT NOT NULL,
    last_seen_at  TEXT NOT NULL
  );
  CREATE TABLE employers (
    id            TEXT PRIMARY KEY,
    household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member        TEXT NOT NULL CHECK (member IN ('self','spouse')),
    enc_settings  BLOB NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE TABLE documents (
    id            TEXT PRIMARY KEY,
    household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    employer_id   TEXT REFERENCES employers(id) ON DELETE SET NULL,
    doc_type      TEXT NOT NULL CHECK (doc_type IN ('paystub','w2')),
    tax_year      INTEGER NOT NULL,
    enc_fields    BLOB NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX idx_documents_household ON documents(household_id, doc_type, tax_year);
  CREATE TABLE checklist_items (
    id            TEXT PRIMARY KEY,
    household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    form_type     TEXT NOT NULL,
    enc_source    BLOB NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('expected','received','mismatch','overdue')),
    due_date      TEXT,
    updated_at    TEXT NOT NULL
  );
  CREATE TABLE audit_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id  TEXT,
    action        TEXT NOT NULL,
    ip_hash       TEXT,
    at            TEXT NOT NULL
  );
  `,
  // 2: plan. Not personal data, so stored in plain text.
  `
  ALTER TABLE households ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','annual'));
  ALTER TABLE households ADD COLUMN plan_until TEXT;
  ALTER TABLE households ADD COLUMN stripe_session_id TEXT;
  `,
];

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const path = process.env.DB_PATH ?? "./data/paytrail.db";
  mkdirSync(dirname(path), { recursive: true });
  const conn = new Database(path);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  const current = conn.pragma("user_version", { simple: true }) as number;
  for (let i = current; i < MIGRATIONS.length; i++) {
    conn.transaction(() => {
      conn.exec(MIGRATIONS[i]);
      conn.pragma(`user_version = ${i + 1}`);
    })();
  }
  db = conn;
  return db;
}

export function audit(householdId: string | null, action: string, ipHash: string | null): void {
  getDb()
    .prepare("INSERT INTO audit_log (household_id, action, ip_hash, at) VALUES (?, ?, ?, ?)")
    .run(householdId, action, ipHash, new Date().toISOString());
}
