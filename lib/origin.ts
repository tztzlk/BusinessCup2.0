// Behind the Fly proxy req.url carries the container's bind address (0.0.0.0:3000), so the public
// origin comes from the forwarded host.
export function publicOrigin(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
