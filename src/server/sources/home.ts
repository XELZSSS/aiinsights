import type { AppContext } from "@/server/context";
import { getArenaLeaderboard } from "@/server/sources/arena";
import { getModels } from "@/server/sources/huggingface";
import { getOpenRouterRankings } from "@/server/sources/openrouter";
import { settled } from "@/server/core/utils";
import type { HomeDashboardData } from "@/shared/types";

export async function getHomeDashboard(ctx: AppContext): Promise<HomeDashboardData> {
  const [orRankings, arena, opensource] = await Promise.allSettled([
    getOpenRouterRankings(ctx, {}),
    getArenaLeaderboard(ctx, { category: "text-to-image" }),
    getModels(ctx, { sort: "trendingScore", direction: "-1", limit: 500 }),
  ]);
  return {
    orRankings: settled(orRankings, null),
    arena: settled(arena, null),
    opensource: settled(opensource, null),
  };
}
