/** Resolve a settled promise result to its value, or a fallback on rejection. */
export function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/** Extract a readable message from an unknown thrown value. */
export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Join rejected reasons as "label: message" for diagnostics. */
export function formatSettleErrors(
  results: readonly PromiseSettledResult<unknown>[],
  labels: readonly string[],
): string {
  return results
    .map((r, i) => (r.status === "rejected" ? `${labels[i] ?? i}: ${errMsg(r.reason)}` : null))
    .filter(Boolean)
    .join("; ");
}
