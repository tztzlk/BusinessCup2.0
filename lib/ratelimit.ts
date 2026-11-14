import "server-only";

// Fixed-window in-memory limiter. Fine for a single Fly machine.
const windows = new Map<string, { start: number; count: number; windowMs: number }>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, count: 1, windowMs });
    if (windows.size > 10_000) {
      // Each entry expires by its own window, so a short-window sweep never resets a long-window key.
      for (const [k, v] of windows) if (now - v.start > v.windowMs) windows.delete(k);
    }
    return limit >= 1;
  }
  w.count += 1;
  return w.count <= limit;
}

const TEN_MIN = 10 * 60 * 1000;

/**
 * Per-route limits for a 10-minute window. A visitor is a household (cookie); requests without
 * one share the IP's budget. The IP ceiling is high because a room of judges on one Wi-Fi shares
 * one public IP; Claude spend is bounded separately by CLAUDE_HOURLY_CAP. Each number can be
 * overridden with an env var, e.g. RATE_EXPLAIN_PER_IP=400.
 */
export const RATE_LIMITS = {
  extract: { perVisitor: 15, perIp: 80 },
  explain: { perVisitor: 40, perIp: 240 },
  household: { perVisitor: Infinity, perIp: 120 },
} as const;

type Route = keyof typeof RATE_LIMITS;

function limitFromEnv(route: Route, kind: "perVisitor" | "perIp"): number {
  const name = `RATE_${route.toUpperCase()}_${kind === "perIp" ? "PER_IP" : "PER_VISITOR"}`;
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : RATE_LIMITS[route][kind];
}

/** True if this request is within both the visitor's and the IP's budget. */
export function allowRequest(route: Route, ip: string, visitorId: string | null): boolean {
  const okIp = allow(`${route}:ip:${ip}`, limitFromEnv(route, "perIp"), TEN_MIN);
  if (!visitorId) return okIp;
  const perVisitor = limitFromEnv(route, "perVisitor");
  const okVisitor = perVisitor === Infinity || allow(`${route}:hh:${visitorId}`, perVisitor, TEN_MIN);
  return okIp && okVisitor;
}
