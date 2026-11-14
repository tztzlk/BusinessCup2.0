// Dollar helpers. All engine math is in dollars as floats, rounded at the edges.

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const pos = (n: number) => (n > 0 ? n : 0);

/** True when two printed dollar amounts differ by more than a rounding tolerance. */
export function differs(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) > tolerance;
}
