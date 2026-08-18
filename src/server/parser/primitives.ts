export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const numOr = (v: unknown, fallback = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return fallback;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v: unknown): string => (typeof v === "string" ? v : "");

export const strOr = (v: unknown): string | null | undefined => {
  if (v == null) return v;
  return typeof v === "string" ? v : undefined;
};

export const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

export const obj = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
