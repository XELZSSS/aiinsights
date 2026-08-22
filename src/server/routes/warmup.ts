import type { RouteDef } from "./types";

/**
 * Expand each route into concrete warmup URLs: cartesian product of enum params
 * filled with defaults for warm routes; non-warm routes use defaults only.
 */
export function buildWarmUrls(base: string, routes: readonly RouteDef[]): string[] {
  return routes.flatMap((route) => {
    const specs = route.query ?? {};
    const entries = Object.entries(specs);
    let combos: Record<string, string>[] = [{}];

    if (route.warm) {
      // Enumerate every combination of enum-valued params so each variant is warmed.
      for (const [name, spec] of entries) {
        if (spec.type !== "enum") continue;
        combos = combos.flatMap((combo) => spec.values.map((v) => ({ ...combo, [name]: v })));
      }
      // Fill any remaining params with their defaults.
      for (const [name, spec] of entries) {
        if (spec.type === "enum" || spec.default === undefined) continue;
        for (const combo of combos) if (combo[name] === undefined) combo[name] = spec.default;
      }
    } else {
      const combo = combos[0]!;
      for (const [name, spec] of entries) {
        if (spec.default === undefined) continue;
        combo[name] = spec.default;
      }
    }

    return combos.map((combo) => {
      const qs = new URLSearchParams(combo).toString();
      return `${base}${route.path}${qs ? `?${qs}` : ""}`;
    });
  });
}
