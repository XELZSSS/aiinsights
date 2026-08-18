import { describe, expect, it } from "vitest";
import { validateQuery } from "@/server/core/validate";
import { ValidationError } from "@/server/core/errors";

describe("validateQuery", () => {
  it("applies defaults when the param is missing", () => {
    const out = validateQuery({}, { sort: { type: "enum", values: ["a", "b"], default: "a" } });
    expect(out.sort).toBe("a");
  });

  it("keeps provided values", () => {
    const out = validateQuery({ sort: "b" }, { sort: { type: "enum", values: ["a", "b"] } });
    expect(out.sort).toBe("b");
  });

  it("normalizes number params", () => {
    const out = validateQuery({ limit: "42" }, { limit: { type: "number", min: 1, max: 100 } });
    expect(out.limit).toBe("42");
  });

  it("rejects out-of-range numbers", () => {
    expect(() => validateQuery({ limit: "101" }, { limit: { type: "number", min: 1, max: 100 } })).toThrowError(
      ValidationError,
    );
    expect(() => validateQuery({ limit: "0" }, { limit: { type: "number", min: 1, max: 100 } })).toThrowError(
      ValidationError,
    );
  });

  it("rejects non-numeric number params", () => {
    expect(() => validateQuery({ limit: "abc" }, { limit: { type: "number" } })).toThrowError(ValidationError);
  });

  it("rejects values outside the enum", () => {
    expect(() => validateQuery({ cat: "x" }, { cat: { type: "enum", values: ["a", "b"] } })).toThrowError(
      ValidationError,
    );
  });

  it("omits unknown params", () => {
    const out = validateQuery({ extra: "1" }, {});
    expect(out).toEqual({});
  });
});
