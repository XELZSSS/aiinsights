import { createApp } from "@/server/app";
import { routeDefs } from "@/server/routes";
import type { RouteDef } from "@/server/routes";
import type { QuerySpec } from "@/server/core";
import type { Env } from "@/server/app";

const app = createApp(routeDefs);

function isEnumParam(entry: [string, QuerySpec]): entry is [string, QuerySpec & { type: "enum" }] {
  return entry[1].type === "enum";
}

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
    await warmUrls(buildWarmUrls(routeDefs), env);
  },
};
