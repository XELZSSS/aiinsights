import { describe, expect, it } from "vitest";
import { extractRscScripts, findArrayInTree, findNextData, parseRscPayload } from "@/server/parsers/rsc";

function scriptHtml(payload: string): string {
  const escaped = JSON.stringify(payload).slice(1, -1);
  return `<html><script>self.__next_f.push([1,"${escaped}"])</script></html>`;
}

describe("extractRscScripts", () => {
  it("extracts and unescapes payloads from next.js scripts", () => {
    const payload = JSON.stringify({
      entries: [
        { rank: 1, name: "A" },
        { rank: 2, name: "B" },
      ],
    });
    expect(extractRscScripts(scriptHtml(payload))).toBe(payload);
  });

  it("handles unicode escapes inside payloads", () => {
    const payload = JSON.stringify({ entries: [{ name: "Über" }] });
    expect(extractRscScripts(scriptHtml(payload))).toContain("Über");
  });

  it("returns an empty string when no scripts are present", () => {
    expect(extractRscScripts("<html><body>plain</body></html>")).toBe("");
  });
});

describe("findNextData", () => {
  it("finds the first array under a key in a nested tree", () => {
    const tree = { leaderboard: { entries: [{ rank: 1 }] } };
    expect(findNextData(tree, "entries")).toEqual([{ rank: 1 }]);
  });

  it("returns null when the key is absent", () => {
    expect(findNextData({ other: [1] }, "entries")).toBeNull();
  });
});

describe("findArrayInTree", () => {
  it("returns the largest matching array", () => {
    const tree = {
      a: [{ id: 1, marker: true }],
      b: [
        { id: 2, marker: true },
        { id: 3, marker: true },
      ],
    };
    const result = findArrayInTree<{ id: number }>(tree, (m) => (m as { marker?: boolean })?.marker === true);
    expect(result).toHaveLength(2);
  });

  it("returns null when no array matches", () => {
    expect(findArrayInTree({ a: [1] }, () => false)).toBeNull();
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