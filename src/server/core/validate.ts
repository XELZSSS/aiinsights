import { ValidationError } from "./errors";

/** Schema for a numeric query param, with optional default and inclusive bounds. */
export interface NumberSpec {
  type: "number";
  default?: string;
  min?: number;
  max?: number;
}

/** Schema for an enum query param; V carries the allowed values into the validated result type. */
export interface EnumSpec<V extends string = string> {
  type: "enum";
  values: readonly V[];
  default?: V;
}

export type QuerySpec = NumberSpec | EnumSpec;

export type QuerySchema = Record<string, QuerySpec>;

/** Build an enum spec, preserving the literal union of its allowed values. */
export const qEnum = <const V extends string>(values: readonly V[], defaultValue?: V): EnumSpec<V> => ({
  type: "enum",
  values,
  ...(defaultValue === undefined ? {} : { default: defaultValue }),
});

/** Build a number spec with optional default (as string) and inclusive min/max bounds. */
export const qNum = (opts: { default?: string; min?: number; max?: number } = {}): NumberSpec => ({
  type: "number",
  ...opts,
});

type SpecValue<S extends QuerySpec> = S extends EnumSpec<infer V> ? V : string;

/** Map a query schema to the shape validateQuery returns: one value per schema key. */
export type ValidatedQuery<S extends QuerySchema> = { [K in keyof S]: SpecValue<S[K]> };

/** Validate raw query params against a schema, applying defaults and coercing numbers; unknown params are dropped. */
export function validateQuery<S extends QuerySchema>(raw: Record<string, string>, schema: S): ValidatedQuery<S> {
  const out: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(schema)) {
    const rawValue = raw[name] ?? spec.default;
    if (rawValue === undefined) continue;
    switch (spec.type) {
      case "number": {
        const n = Number(rawValue);
        if (!Number.isFinite(n)) throw new ValidationError(`Query param "${name}" must be a number`);
        if (spec.min != null && n < spec.min) throw new ValidationError(`Query param "${name}" must be >= ${spec.min}`);
        if (spec.max != null && n > spec.max) throw new ValidationError(`Query param "${name}" must be <= ${spec.max}`);
        out[name] = String(n);
        break;
      }
      case "enum": {
        if (!(spec.values as readonly string[]).includes(rawValue)) {
          throw new ValidationError(`Query param "${name}" must be one of: ${spec.values.join(", ")}`);
        }
        out[name] = rawValue;
        break;
      }
    }
  }
  return out as ValidatedQuery<S>;
}
