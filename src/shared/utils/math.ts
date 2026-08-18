export function normalizePercent(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value === 0) return 0;
  if (value >= -1 && value <= 1) return value * 100;
  return value;
}

export function approxEq(a: number, b: number, eps = 1e-9): boolean {
  if (a === b) return true;
  return Math.abs(a - b) < eps * Math.max(1, Math.abs(a), Math.abs(b));
}

export function clampPercent(value: number | null | undefined): number | null {
  const norm = normalizePercent(value);
  if (norm == null) return null;
  return Math.max(0, Math.min(100, norm));
}
