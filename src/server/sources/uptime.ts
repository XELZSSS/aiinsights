import type { AppContext } from "@/server/app";

const FIRST_LAUNCH_KEY = "uptime:first-launch";

interface UptimePayload {
  firstLaunchAt: string;
  uptimeMs: number;
}

export async function getUptime(ctx: AppContext): Promise<UptimePayload> {
  const now = Date.now();
  const kv = ctx.kv;

  if (!kv) {
    return { firstLaunchAt: new Date(now).toISOString(), uptimeMs: 0 };
  }

  const raw = await kv.get(FIRST_LAUNCH_KEY);
  let firstLaunchMs = Number(raw);
  if (!raw || !Number.isFinite(firstLaunchMs)) {
    firstLaunchMs = now;
    try {
      await kv.put(FIRST_LAUNCH_KEY, String(firstLaunchMs));
    } catch (err) {
      ctx.log("warn", `[uptime] failed to persist first launch: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    firstLaunchAt: new Date(firstLaunchMs).toISOString(),
    uptimeMs: Math.max(0, now - firstLaunchMs),
  };
}
