// Everything PayTrail keeps in the browser besides the httpOnly session cookie (the server clears that one).
// Listed in one place so "Delete my data" can clear it and /privacy can describe it.

/** localStorage: cached explanation texts (finding codes, amounts, text). See components/useExplanations.ts. */
export const EXPLANATIONS_KEY = "pt_explain_v2";
/** sessionStorage: a confirmed document waiting for checkout. See lib/pendingDocument.ts. */
export const PENDING_DOCUMENT_KEY = "pt_pending_document";

/** Removes PayTrail's data from this browser. Safe to call where storage is blocked. */
export function clearBrowserData(): void {
  try {
    localStorage.removeItem(EXPLANATIONS_KEY);
  } catch {
    // Storage blocked: nothing was stored either.
  }
  try {
    sessionStorage.removeItem(PENDING_DOCUMENT_KEY);
  } catch {
    // Same.
  }
}
