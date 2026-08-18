import { describe, expect, it } from "vitest";
import { parseRscScriptArray, parseRscPayload } from "@/server/parser/rsc";

function scriptHtml(payload: string): string {
  const escaped = JSON.stringify(payload).slice(1, -1);
  return `<html><script>self.__next_f.push([1,"${escaped}"])</script></html>`;
}

describe("parseRscScriptArray", () => {
  it("extracts an array by key from escaped next.js payloads", () => {
    const payload = JSON.stringify({
      entries: [
        { rank: 1, name: "A" },
        { rank: 2, name: "B" },
      ],
    });
    const arr = parseRscScriptArray<{ rank: number; name: string }>(scriptHtml(payload), "entries");
    expect(arr).toHaveLength(2);
    expect(arr[0]).toEqual({ rank: 1, name: "A" });
  });

  it("returns empty when key is missing", () => {
    const payload = JSON.stringify({ other: [1] });
    expect(parseRscScriptArray(scriptHtml(payload), "entries")).toEqual([]);
  });

  it("handles unicode escapes inside payloads", () => {
    const payload = JSON.stringify({ entries: [{ name: "Über" }] });
    const arr = parseRscScriptArray<{ name: string }>(scriptHtml(payload), "entries");
    expect(arr[0]?.name).toBe("Über");
  });
});

describe("parseRscPayload", () => {
  it("parses streamed RSC lines and applies the extractor", () => {
    const body = '0:{"$a":1}\n1:{"tree":{"initialModels":[{"id":"x"}]}}\n';
    const out = parseRscPayload<{ id: string }>(
      body,
      "initialModels",
      (tree) => (tree as { tree?: { initialModels?: { id: string }[] } })?.tree?.initialModels ?? null,
    );
    expect(out).toEqual([{ id: "x" }]);
  });

  it("throws when the marker is absent", () => {
    expect(() => parseRscPayload('1:{"a":1}', "missing", () => null)).toThrow(/not found/);
  });
});
