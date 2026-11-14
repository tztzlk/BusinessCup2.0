import type { Paystub, W2 } from "./types";
import { PENDING_DOCUMENT_KEY } from "./browserData";

// A document the user confirmed but could not save because the free plan was used up. It is kept in
// sessionStorage (this tab only, cleared when the tab closes) while they go through Stripe Checkout,
// and saved to their household when they come back on Annual. Fields only, never the file.

export type PendingDocument =
  | { docType: "paystub"; employerId: string | null; taxYear: number; fields: Paystub }
  | { docType: "w2"; employerId: string | null; taxYear: number; fields: W2 };

const KEY = PENDING_DOCUMENT_KEY;
/** Long enough for a checkout, short enough that a forgotten tab doesn't keep pay data around. */
const MAX_AGE_MS = 60 * 60 * 1000;

type Stored = { savedAt: number; doc: PendingDocument };

export function keepPendingDocument(doc: PendingDocument, now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ savedAt: now, doc } satisfies Stored));
  } catch {
    // Storage blocked or full: the user re-uploads after paying, as before.
  }
}

/** Reads and removes the pending document; null if there is none or it is older than an hour. */
export function takePendingDocument(now = Date.now()): PendingDocument | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (typeof stored?.savedAt !== "number" || now - stored.savedAt > MAX_AGE_MS) return null;
    const d = stored.doc;
    if (!d || (d.docType !== "paystub" && d.docType !== "w2") || typeof d.taxYear !== "number" || !d.fields) return null;
    return d;
  } catch {
    return null;
  }
}

export function hasPendingDocument(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function pendingDocumentLabel(d: PendingDocument): string {
  return d.docType === "paystub" ? `pay stub from ${d.fields.employerName || "your employer"}` : `${d.taxYear} W-2`;
}
