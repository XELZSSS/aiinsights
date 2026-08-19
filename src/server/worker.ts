import { createApp } from "@/server/app";
import { buildWarmUrls, routeDefs } from "@/server/routes";
import type { Env } from "@/server/app";

const app = createApp(routeDefs);

const WARM_BASE = "https://aiinsights.internal";
const WARM_URLS = buildWarmUrls(WARM_BASE);

async function warmUrls(env: Env): Promise<void> {
  const CONCURRENCY = 8;
  let failures = 0;
  const failed: string[] = [];
  for (let i = 0; i < WARM_URLS.length; i += CONCURRENCY) {
    const batch = WARM_URLS.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((url) => app.request(url, {}, env)));
    results.forEach((r, j) => {
      if (r.status === "rejected") {
        failures++;
        failed.push(batch[j] ?? "?");
      }
    });
  }
  if (failures > 0) {
    console.warn(`[warm] ${failures}/${WARM_URLS.length} URLs failed: ${failed.join(", ")}`);
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
    await warmUrls(env);
  },
};
