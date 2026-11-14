import type { Finding, Projection } from "./types";

// Plain-English explanations from Claude for engine findings (POST /api/explain).
// The request carries only codes and numbers. Claude's text is shown only if every dollar
// amount it quotes is one of the engine's numbers; otherwise the UI keeps the engine's text.

export interface ExplainRequest {
  findings: Array<{
    id: string;
    code: string;
    severity: Finding["severity"];
    amountUsd: number;
    actionKind: Finding["action"]["kind"];
    inputs: Record<string, number>;
  }>;
  projection: { balance: number; taxYear: number } | null;
}

export interface ExplainResponse {
  summary: string;
  items: Array<{ id: string; code: string; title: string; body: string }>;
}

export const findingId = (index: number) => `f${index}`;

export function buildExplainRequest(findings: Finding[], projection: Projection | null): ExplainRequest {
  return {
    findings: findings.slice(0, 20).map((f, i) => ({
      id: findingId(i),
      code: f.code,
      severity: f.severity,
      amountUsd: round2(f.amountUsd),
      actionKind: f.action.kind,
      // Numbers only: drops text inputs such as dates or box labels.
      inputs: Object.fromEntries(
        Object.entries(f.inputs).filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1])),
      ),
    })),
    projection: projection ? { balance: round2(projection.balance), taxYear: projection.taxYear } : null,
  };
}

/** Dollar amounts quoted in a text, e.g. "$7,573" or "$1,560.00" → [7573, 1560]. */
export function quotedDollars(text: string): number[] {
  return [...text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/g)].map((m) => Number(m[1].replace(/,/g, "") + (m[2] ?? "")));
}

/** True if every dollar amount in `text` matches (to the dollar) one of `allowed`. */
export function numbersAreGrounded(text: string, allowed: number[]): boolean {
  const ok = allowed.filter(Number.isFinite).map((n) => Math.abs(n));
  return quotedDollars(text).every((q) => ok.some((a) => Math.abs(a - q) <= 1));
}

/**
 * Maps a response to finding index → body, keeping only items whose numbers are grounded
 * in that finding (or the projection balance).
 */
export function groundedBodies(req: ExplainRequest, res: ExplainResponse): Map<number, string> {
  const out = new Map<number, string>();
  req.findings.forEach((f, i) => {
    const item = res.items.find((x) => x.id === f.id && x.code === f.code);
    const body = item?.body.trim();
    if (!body) return;
    const allowed = [f.amountUsd, ...Object.values(f.inputs), ...(req.projection ? [req.projection.balance] : [])];
    if (numbersAreGrounded(body, allowed)) out.set(i, body);
  });
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
