import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { reset } from "cloudflare:test";
import worker from "@/server/worker";
import { upstreamConfig } from "@/shared/config";

const OR = upstreamConfig.openrouter;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockUpstream(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/models") {
      return jsonResponse({
        data: [{ id: "openai/gpt-5", pricing: { prompt: "1", completion: "2" } }],
      });
    }
    if (url.pathname === "/api/frontend/v1/rankings/models") {
      return jsonResponse({
        data: [
          {
            date: "2026-08-01",
            model_permaslug: "openai/gpt-5",
            variant: "OpenAI GPT-5",
            variant_permaslug: "openai/gpt-5",
            total_prompt_tokens: 100,
            total_completion_tokens: 50,
            count: 10,
            change: 1,
          },
        ],
      });
    }
    return jsonResponse({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function arenaHtml(entries: unknown[]): string {
  const json = JSON.stringify({ arena: {}, leaderboard: { entries } });
  const escaped = json.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `<!doctype html><script>self.__next_f.push([1,"${escaped}"])</script>`;
}

describe("Worker API integration (workerd runtime)", () => {
  beforeEach(async () => {
    await reset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves /api/openrouter-rankings from a mocked upstream", async () => {
    const fetchMock = mockUpstream();

    const res = await worker.fetch(new Request(`${OR}/api/openrouter-rankings`), env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        tokenUsageRankings: { name: string; creator: string; totalTokens: number; pricing: { prompt: number } }[];
      };
    };
    expect(body.data.tokenUsageRankings).toHaveLength(1);
    const entry = body.data.tokenUsageRankings[0]!;
    expect(entry.name).toBe("GPT 5");
    expect(entry.creator).toBe("OpenAI");
    expect(entry.totalTokens).toBe(150);
    expect(entry.pricing.prompt).toBe(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves repeated requests from the KV cache without refetching upstream", async () => {
    const fetchMock = mockUpstream();

    const url = new Request(`${OR}/api/openrouter-rankings`);
    const first = await worker.fetch(url, env);
    expect(first.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const second = await worker.fetch(new Request(`${OR}/api/openrouter-rankings`), env);
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns 400 for an invalid enum query param", async () => {
    const res = await worker.fetch(new Request(`${OR}/api/arena-leaderboard?category=invalid`), env);
    expect(res.status).toBe(400);
  });

  it("filters Day-1 promo entries and maps rating confidence intervals", async () => {
    const arenaFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/leaderboard/text-to-image") {
        return new Response(
          arenaHtml([
            { rank: 1, modelDisplayName: "model-a", rating: 1506.5, ratingUpper: 1512, ratingLower: 1501, votes: 100 },
            { rank: 0, modelDisplayName: "deepseek-v4-pro-max-20260813", isDay1: true, rating: 0, votes: 0 },
            { rank: 2, modelDisplayName: "model-b", rating: 1400, ratingUpper: 1410, ratingLower: 1390, votes: 50 },
          ]),
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", arenaFetch);

    const res = await worker.fetch(new Request(`${OR}/api/arena-leaderboard?category=text-to-image`), env);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        category: string;
        models: { model: string; rating: number | null; ratingUpper: number | null; ratingLower: number | null }[];
      };
    };
    expect(body.data.models).toHaveLength(2);
    expect(body.data.models.some((m) => m.model.includes("deepseek-v4-pro-max"))).toBe(false);

    const first = body.data.models[0]!;
    expect(first.model).toBe("model-a");
    expect(first.rating).toBe(1506.5);
    expect(first.ratingUpper).toBe(1512);
    expect(first.ratingLower).toBe(1501);
  });

  it("returns 404 JSON for unknown API routes", async () => {
    const res = await worker.fetch(new Request(`${OR}/api/nope`), env);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: number } };
    expect(body.error.code).toBe(404);
  });
});
