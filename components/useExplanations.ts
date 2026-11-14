"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { buildExplainRequest, directionMatches, groundedBodies, numbersAreGrounded, type ExplainRequest } from "@/lib/explain";
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

function fetchExplanations(req: ExplainRequest): Promise<Result> {
  const key = JSON.stringify(req);
  let pending = cache.get(key);
  if (!pending) {
    pending = api
      .explain(req)
      .then((res) => {
        const allNumbers = req.findings.flatMap((f) => [f.amountUsd, ...Object.values(f.inputs)]);
        if (req.projection) allNumbers.push(req.projection.balance);
        const text = res.summary?.trim();
        const summary =
          text && numbersAreGrounded(text, allNumbers) && directionMatches(text, req.projection?.balance) ? text : null;
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
