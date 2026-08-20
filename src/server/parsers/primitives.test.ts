import { describe, expect, it } from "vitest";
import { num, numOr, str, strOr, bool, obj } from "@/server/parsers/primitives";

// Tests for the defensive coercion helpers used on untyped upstream JSON.
describe("num", () => {
  it("accepts finite numbers", () => {
    expect(num(42)).toBe(42);
  });
  it("rejects non-numbers", () => {
    expect(num("42")).toBeNull();
    expect(num(null)).toBeNull();
    expect(num(Number.NaN)).toBeNull();
    expect(num(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("numOr", () => {
  it("parses numbers and numeric strings", () => {
    expect(numOr(3)).toBe(3);
    expect(numOr("12")).toBe(12);
  });
  it("uses fallback for invalid input", () => {
    expect(numOr("abc", 7)).toBe(7);
    expect(numOr(null, 7)).toBe(7);
    expect(numOr(Number.NaN, 7)).toBe(7);
  });
  it("maps booleans", () => {
    expect(numOr(true)).toBe(1);
    expect(numOr(false)).toBe(0);
  });
  it("handles empty strings as fallback", () => {
    expect(numOr("   ", 5)).toBe(5);
  });
});

describe("str / strOr", () => {
  it("returns only strings", () => {
    expect(str("x")).toBe("x");
    expect(str(3)).toBe("");
    expect(str(null)).toBe("");
  });
  it("strOr preserves null and drops non-strings", () => {
    expect(strOr(null)).toBeNull();
    expect(strOr("x")).toBe("x");
    expect(strOr(3)).toBeUndefined();
    expect(strOr(undefined)).toBeUndefined();
  });
});

describe("bool", () => {
  it("returns only booleans", () => {
    expect(bool(true)).toBe(true);
    expect(bool(1)).toBeUndefined();
  });
});

describe("obj", () => {
  it("returns plain objects only", () => {
    expect(obj({ a: 1 })).toEqual({ a: 1 });
    expect(obj(null)).toBeUndefined();
    expect(obj([1])).toBeUndefined();
  });
});
