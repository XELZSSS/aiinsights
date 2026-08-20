/** Converts a 0-1 ratio into a percentage (0-100); values already in percent are left unchanged. */
export function normalizePercent(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value === 0) return 0;
  // Sources store indexes either as ratios (-1..1) or raw percentages; normalize the ratio form.
  if (value >= -1 && value <= 1) return value * 100;
  return value;
}

/** Approximate equality using a relative epsilon, so scale doesn't matter. */
export function approxEq(a: number, b: number, eps = 1e-9): boolean {
  if (a === b) return true;
  return Math.abs(a - b) < eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Normalizes a percent-like value and clamps it into the valid [0, 100] range. */
export function clampPercent(value: number | null | undefined): number | null {
  const norm = normalizePercent(value);
  if (norm == null) return null;
  return Math.max(0, Math.min(100, norm));
}
