/** Resolve a settled promise result to its value, or a fallback on rejection. */
export function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/** Join rejected reasons as "label: message" for diagnostics. */
export function formatSettleErrors(
  results: readonly PromiseSettledResult<unknown>[],
  labels: readonly string[],
): string {
  return results
    .map((r, i) =>
      r.status === "rejected"
        ? `${labels[i] ?? i}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
        : null,
    )
    .filter(Boolean)
    .join("; ");
}
