import { describe, expect, it } from "vitest";
import { decodeEntities, stripHtml } from "@/server/parsers/html";

describe("decodeEntities", () => {
  it("decodes named entities", () => {
    expect(decodeEntities("AT&amp;T")).toBe("AT&T");
    expect(decodeEntities("&lt;tag&gt;")).toBe("<tag>");
  });
  it("decodes decimal and hex references", () => {
    expect(decodeEntities("&#65;")).toBe("A");
    expect(decodeEntities("&#x41;")).toBe("A");
  });
  it("leaves unknown entities untouched", () => {
    expect(decodeEntities("&bogus;")).toBe("&bogus;");
  });
  it("rejects out-of-range code points", () => {
    expect(decodeEntities("&#x110000;")).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes tags and keeps text", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
  it("ignores angle brackets inside quoted attributes", () => {
    expect(stripHtml('<a title="a < b">x</a>')).toBe("x");
  });
  it("handles unterminated tags", () => {
    expect(stripHtml("abc <div")).toBe("abc <div");
  });
});
