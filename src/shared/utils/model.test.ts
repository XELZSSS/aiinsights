import { describe, expect, it } from "vitest";
import { calcModelCost, calcMonthlyCost } from "@/shared/utils/model";
import type { ArtificialAnalysisModel } from "@/shared/types";

function makeModel(over: Partial<ArtificialAnalysisModel>): ArtificialAnalysisModel {
  return { id: "m", slug: "m", name: "M", intelligence_index: null, ...over };
}

describe("calcModelCost", () => {
  it("computes input and output cost from per-million prices", () => {
    const model = makeModel({ pricing: { input: 1, output: 2, cache_hit: 0.1 } });
    expect(calcModelCost(model, 1_000_000, 1_000_000)).toBe(3);
  });

  it("splits input between cached and uncached rates by cacheHitRate", () => {
    const model = makeModel({ pricing: { input: 10, output: 2, cache_hit: 1 } });
    const cost = calcModelCost(model, 2_000_000, 0, { cacheHitRate: 0.5 });
    expect(cost).toBe(11);
  });

  it("falls back to input price when cache_hit is missing", () => {
    const model = makeModel({ pricing: { input: 10, output: 2, cache_hit: null } });
    const cost = calcModelCost(model, 1_000_000, 0, { cacheHitRate: 1 });
    expect(cost).toBe(10);
  });

  it("bills reasoning tokens at the output rate", () => {
    const model = makeModel({ pricing: { input: 1, output: 2, cache_hit: null } });
    const cost = calcModelCost(model, 1_000_000, 1_000_000, { reasoningTokens: 2_000_000 });
    expect(cost).toBe(1 + 3 * 2);
  });

  it("clamps cacheHitRate to [0, 1]", () => {
    const model = makeModel({ pricing: { input: 10, output: 2, cache_hit: 1 } });
    expect(calcModelCost(model, 1_000_000, 0, { cacheHitRate: 5 })).toBe(1);
    expect(calcModelCost(model, 1_000_000, 0, { cacheHitRate: -1 })).toBe(10);
  });

  it("clamps negative token counts to zero", () => {
    const model = makeModel({ pricing: { input: 1, output: 2, cache_hit: null } });
    expect(calcModelCost(model, -5, -5)).toBe(0);
  });

  it("returns null when pricing is missing", () => {
    expect(calcModelCost(makeModel({}), 1_000_000, 1_000_000)).toBeNull();
  });

  it("returns null when input/output prices are missing", () => {
    expect(calcModelCost(makeModel({ pricing: { cache_hit: 0.1 } }), 1_000_000, 1_000_000)).toBeNull();
  });

  it("returns null for non-finite tokens", () => {
    const model = makeModel({ pricing: { input: 1, output: 2, cache_hit: null } });
    expect(calcModelCost(model, Number.NaN, 1_000_000)).toBeNull();
  });
});

describe("calcMonthlyCost", () => {
  it("scales daily cost by days per month", () => {
    const model = makeModel({ pricing: { input: 1, output: 2, cache_hit: null } });
    const cost = calcMonthlyCost(model, {
      dailyInput: 1_000_000,
      dailyOutput: 1_000_000,
      cacheHitRate: 0,
      daysPerMonth: 22,
    });
    expect(cost).toBe(3 * 22);
  });

  it("forwards reasoning and cache settings", () => {
    const model = makeModel({ pricing: { input: 10, output: 2, cache_hit: 1 } });
    const cost = calcMonthlyCost(model, {
      dailyInput: 2_000_000,
      dailyOutput: 0,
      dailyReasoning: 1_000_000,
      cacheHitRate: 0.5,
      daysPerMonth: 22,
    });
    expect(cost).toBe(13 * 22);
  });

  it("clamps daysPerMonth to at least 1", () => {
    const model = makeModel({ pricing: { input: 1, output: 2, cache_hit: null } });
    const cost = calcMonthlyCost(model, {
      dailyInput: 1_000_000,
      dailyOutput: 1_000_000,
      cacheHitRate: 0,
      daysPerMonth: 0,
    });
    expect(cost).toBe(3);
  });

  it("returns null when model has no pricing", () => {
    const cost = calcMonthlyCost(makeModel({}), {
      dailyInput: 1_000_000,
      dailyOutput: 1_000_000,
      cacheHitRate: 0,
      daysPerMonth: 22,
    });
    expect(cost).toBeNull();
  });
});
