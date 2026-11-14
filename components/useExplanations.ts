"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import {
  aprilYearMatches,
  buildExplainRequest,
  directionMatches,
  groundedBodies,
  numbersAreGrounded,
  type ExplainRequest,
  type ExplainResponse,
} from "@/lib/explain";
import { EXPLANATIONS_KEY } from "@/lib/browserData";
import type { Finding, Projection } from "@/lib/types";

export interface Explanations {
  status: "idle" | "loading" | "ready" | "failed";
  /** Finding index → Claude's text. Missing index = show the engine's text. */
  bodies: Map<number, string>;
  summary: string | null;
}

type Result = { bodies: Map<number, string>; summary: string | null } | null;

// One request per distinct set of findings for the lifetime of the page (switching demo modes back and
// forth does not call the API again). A failed request resolves to null and the engine text stays.
const cache = new Map<string, Promise<Result>>();

// Responses are also kept in this browser, so reloading the report doesn't pay for the same texts
// again. Requests and responses hold only finding codes and numbers, no personal data.
const STORE = EXPLANATIONS_KEY;
const STORE_MAX = 20;

function stored(key: string): ExplainResponse | null {
  try {
    const all = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, ExplainResponse>;
    return all[key] ?? null;
  } catch {
    return null;
  }
}

function store(key: string, res: ExplainResponse): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, ExplainResponse>;
    delete all[key];
    all[key] = res;
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - STORE_MAX))) delete all[k];
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    // Storage full or blocked: the in-memory cache still works for this page.
  }
}

function fetchExplanations(req: ExplainRequest): Promise<Result> {
  const key = JSON.stringify(req);
  let pending = cache.get(key);
  if (!pending) {
    const saved = stored(key);
    const response = saved
      ? Promise.resolve(saved)
      : api.explain(req).then((res) => {
          store(key, res);
          return res;
        });
    pending = response
      .then((res) => {
        const allNumbers = req.findings.flatMap((f) => [f.amountUsd, ...Object.values(f.inputs)]);
        if (req.projection) allNumbers.push(req.projection.balance);
        const text = res.summary?.trim();
        const summary =
          text && numbersAreGrounded(text, allNumbers) && directionMatches(text, req.projection?.balance) &&
          aprilYearMatches(text, req.projection?.taxYear)
            ? text
            : null;
        return { bodies: groundedBodies(req, res), summary };
      })
      .catch(() => {
        cache.delete(key); // allow a retry on the next visit
        return null;
      });
    cache.set(key, pending);
  }
  return pending;
}

export function useExplanations(findings: Finding[], projection: Projection | null): Explanations {
  const req = useMemo(() => buildExplainRequest(findings, projection), [findings, projection]);
  const key = JSON.stringify(req);
  const [state, setState] = useState<Explanations & { key: string }>({ key: "", status: "idle", bodies: new Map(), summary: null });

  useEffect(() => {
    if (req.findings.length === 0) return;
    let alive = true;
    setState({ key, status: "loading", bodies: new Map(), summary: null });
    fetchExplanations(req).then((r) => {
      if (!alive) return;
      setState(r ? { key, status: "ready", ...r } : { key, status: "failed", bodies: new Map(), summary: null });
    });
    return () => {
      alive = false;
    };
    // `key` captures every change to `req`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (req.findings.length === 0 || state.key !== key) return { status: req.findings.length ? "loading" : "idle", bodies: new Map(), summary: null };
  return state;
}
