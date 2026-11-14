const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function money(value: number | null | undefined, whole = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return (whole ? usdWhole : usd).format(value);
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b401k\b/i, "401(k)")
    .replace(/^\w/, (c) => c.toUpperCase());
}
