import { createApp } from "./app";
import { routeDefs } from "./routes";
import type { RouteDef } from "./routes/register";
import type { QuerySpec } from "./core";
import type { Env } from "./context";

const app = createApp(routeDefs);

function isEnumParam(entry: [string, QuerySpec]): entry is [string, QuerySpec & { type: "enum" }] {
  return entry[1].type === "enum";
}

// Build one URL per route. Enum query params are fully enumerated (cartesian
// product) so every variant is warmed, not just the schema defaults; otherwise
// e.g. the video arena category or the "funding" news feed would stay cold.
function buildWarmUrls(routes: RouteDef[]): URL[] {
  const urls: URL[] = [];
  for (const route of routes) {
    const base = new URL(`https://aiinsights.internal${route.path}`);
    const enumParams = (Object.entries(route.query ?? {}) as Array<[string, QuerySpec]>).filter(isEnumParam);

    let combos: Array<Array<[string, string]>> = [];
    for (const [name, spec] of enumParams) {
      const variants = spec.values.map((value) => [name, value] as [string, string]);
      if (combos.length === 0) {
        combos = variants.map((v) => [v]);
      } else {
        combos = combos.flatMap((combo) => variants.map((v) => [...combo, v]));
      }
    }

    if (combos.length === 0) {
      urls.push(base);
      continue;
    }
    for (const combo of combos) {
      const url = new URL(base.href);
      for (const [name, value] of combo) url.searchParams.set(name, value);
      urls.push(url);
    }
  }
  return urls;
}

// Keep the shared cache warm so users never pay cold-start upstream latency;
// runs via the cron trigger in wrangler.jsonc (every 4 minutes by default).
async function warmUrls(urls: URL[], env: Env): Promise<void> {
  const CONCURRENCY = 8;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map((url) => app.request(url, {}, env)));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isApi = url.pathname === "/api" || url.pathname.startsWith("/api/");
    const response = await app.fetch(request, env);
    if (!isApi && response.status === 404 && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return response;
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    // Warm in small batches: keeps upstream fan-out bounded and stays well
    // under the 1000 subrequest / 15 min cron execution limits.
    await warmUrls(buildWarmUrls(routeDefs), env);
  },
};