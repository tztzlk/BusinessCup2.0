"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, FRIENDLY } from "@/lib/api-client";
import { prepareUpload } from "@/lib/prepareUpload";
import { uploadProblem } from "@/lib/upload";
import type { ExtractResult } from "@/lib/types";

// Files picked on /upload, read one at a time by POST /api/extract (one request per file).
// Everything here lives in this tab's memory only: files are never written to storage, and a reload
// starts over. lib/pendingDocument.ts still keeps a confirmed document across Stripe Checkout.

export type Extracted = Exclude<ExtractResult, { documentType: "other" }>;
export type QueueStatus = "queued" | "reading" | "ready" | "error" | "saved";

export interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  result?: Extracted;
  /** Why it failed, in plain English. */
  error?: string;
  /** false: the same file won't work (wrong type, unreadable); retrying is pointless. */
  retryable?: boolean;
  /** "Try with a sample": the fictional stub, which doesn't count toward the free plan. */
  sample?: boolean;
}

interface QueueValue {
  items: QueueItem[];
  /** Reading stopped after the rate limit; Retry resumes. */
  paused: boolean;
  add: (files: File[], opts?: { sample?: boolean }) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  markSaved: (id: string) => void;
  clear: () => void;
  /** A private link from a household created on this page (shown until saved elsewhere). */
  recoveryUrl: string | null;
  setRecoveryUrl: (url: string | null) => void;
}

const QueueContext = createContext<QueueValue | null>(null);

// Errors that the same file will hit again.
const FILE_ERRORS = new Set(["bad_type", "bad_size", "image_too_large", "too_many_pages", "unreadable", "refused", "truncated"]);

export const RATE_LIMIT_MESSAGE =
  "You've reached the limit of 15 document reads in 10 minutes. Wait a few minutes, then press Retry. Nothing you confirmed is lost.";

let nextId = 1;

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const started = useRef(new Set<string>());

  const patch = useCallback((id: string, p: Partial<QueueItem>) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...p } : i))), []);

  // One read at a time, in the order the files were added.
  useEffect(() => {
    if (paused || items.some((i) => i.status === "reading")) return;
    const next = items.find((i) => i.status === "queued" && !started.current.has(i.id));
    if (!next) return;
    started.current.add(next.id);
    patch(next.id, { status: "reading", error: undefined });
    prepareUpload(next.file)
      .then((file) => {
        // Checked again after the photo is shrunk: the server enforces the same limits.
        const problem = uploadProblem(file);
        if (problem) throw new ApiError(400, problem, FRIENDLY[problem] ?? FRIENDLY.internal);
        return api.extract(file);
      })
      .then((res) => {
        if (res.documentType === "other")
          patch(next.id, { status: "error", retryable: false, error: res.warnings[0] ?? "This doesn't look like a pay stub or a W-2." });
        else patch(next.id, { status: "ready", result: res });
      })
      .catch((e: unknown) => {
        const code = e instanceof ApiError ? e.code : "network";
        if (code === "rate_limited" || (e instanceof ApiError && e.status === 429)) {
          setPaused(true);
          patch(next.id, { status: "error", retryable: true, error: RATE_LIMIT_MESSAGE });
          return;
        }
        patch(next.id, { status: "error", retryable: !FILE_ERRORS.has(code), error: e instanceof Error ? e.message : FRIENDLY.internal });
      });
  }, [items, paused, patch]);

  const add = useCallback((files: File[], opts?: { sample?: boolean }) => {
    const fresh: QueueItem[] = files.map((file) => {
      // Photos are shrunk before upload, so only the raw-size limit applies here.
      const problem = uploadProblem(file, { beforeResize: true });
      return problem
        ? { id: `f${nextId++}`, file, status: "error", retryable: false, error: FRIENDLY[problem], sample: opts?.sample }
        : { id: `f${nextId++}`, file, status: "queued", sample: opts?.sample };
    });
    setItems((all) => [...all.filter((i) => i.status !== "saved"), ...fresh]);
  }, []);

  const retry = useCallback(
    (id: string) => {
      started.current.delete(id);
      setPaused(false);
      patch(id, { status: "queued", error: undefined });
    },
    [patch],
  );
  const remove = useCallback((id: string) => setItems((all) => all.filter((i) => i.id !== id)), []);
  const markSaved = useCallback((id: string) => patch(id, { status: "saved" }), [patch]);
  const clear = useCallback(() => {
    setItems([]);
    setPaused(false);
  }, []);

  const value = useMemo(
    () => ({ items, paused, add, retry, remove, markSaved, clear, recoveryUrl, setRecoveryUrl }),
    [items, paused, add, retry, remove, markSaved, clear, recoveryUrl],
  );
  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useUploadQueue(): QueueValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useUploadQueue must be used inside <UploadQueueProvider>");
  return ctx;
}
