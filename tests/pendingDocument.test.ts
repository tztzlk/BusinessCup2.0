import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasPendingDocument, keepPendingDocument, pendingDocumentLabel, takePendingDocument, type PendingDocument } from "../lib/pendingDocument";
import type { W2 } from "../lib/types";

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

const w2Doc = { docType: "w2", employerId: "emp_1", taxYear: 2026, fields: { taxYear: 2026 } as W2 } as PendingDocument;
const T0 = 1_800_000_000_000;

describe("pending document across checkout", () => {
  beforeEach(() => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = new MemoryStorage();
  });
  afterEach(() => {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  });

  it("is read once, then gone", () => {
    keepPendingDocument(w2Doc, T0);
    expect(hasPendingDocument()).toBe(true);
    expect(takePendingDocument(T0 + 60_000)).toEqual(w2Doc);
    expect(takePendingDocument(T0 + 60_000)).toBeNull();
    expect(hasPendingDocument()).toBe(false);
  });

  it("expires after an hour and is removed anyway", () => {
    keepPendingDocument(w2Doc, T0);
    expect(takePendingDocument(T0 + 61 * 60_000)).toBeNull();
    expect(hasPendingDocument()).toBe(false);
  });

  it("ignores broken entries", () => {
    sessionStorage.setItem("pt_pending_document", "{not json");
    expect(takePendingDocument(T0)).toBeNull();
    sessionStorage.setItem("pt_pending_document", JSON.stringify({ savedAt: T0, doc: { docType: "other" } }));
    expect(takePendingDocument(T0)).toBeNull();
  });

  it("does nothing without storage", () => {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    expect(() => keepPendingDocument(w2Doc, T0)).not.toThrow();
    expect(takePendingDocument(T0)).toBeNull();
  });

  it("names the document for the notice", () => {
    expect(pendingDocumentLabel(w2Doc)).toBe("2026 W-2");
  });
});
