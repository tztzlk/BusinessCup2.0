import "server-only";

// Fixed-window in-memory limiter. Fine for a single Fly machine.
const windows = new Map<string, { start: number; count: number }>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (now - v.start > windowMs) windows.delete(k);
    }
    return true;
  }
  w.count += 1;
  return w.count <= limit;
}
