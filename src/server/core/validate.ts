import { ValidationError } from "./errors";

export type QuerySpec =
  | { type: "number"; default?: string; min?: number; max?: number }
  | { type: "enum"; values: readonly string[]; default?: string };

export type QuerySchema = Record<string, QuerySpec>;

export type ValidatedQuery<S extends QuerySchema> = { [K in keyof S]: string };

export function validateQuery<S extends QuerySchema>(raw: Record<string, string>, schema: S): ValidatedQuery<S> {
  const out: Record<string, string> = {};
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
        if (!spec.values.includes(rawValue)) {
          throw new ValidationError(`Query param "${name}" must be one of: ${spec.values.join(", ")}`);
        }
        out[name] = rawValue;
        break;
      }
    }
  }
  return out as ValidatedQuery<S>;
}
