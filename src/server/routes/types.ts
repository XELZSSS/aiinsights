import type { AppContext } from "@/server/context";
import type { QuerySchema, ValidatedQuery } from "@/server/core/validate";

/** Declarative route descriptor: path, optional query schema (validated per request), cache policy, and the handler. */
export interface RouteDef<S extends QuerySchema = QuerySchema> {
  path: string;
  query?: S;
  warm?: boolean;
  /** Skip browser/CDN caching for responses that must reflect live state (e.g. probe results). */
  noStore?: boolean;
  handler(ctx: AppContext, params: ValidatedQuery<S>): Promise<unknown>;
}

/**
 * Give a single route definition its precise type: the query schema is inferred
 * from the literal so handler params are fully typed without casts.
 */
export function defineRoute<S extends QuerySchema>(def: RouteDef<S>): RouteDef<S> {
  return def;
}
