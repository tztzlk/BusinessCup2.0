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
