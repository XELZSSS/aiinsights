import { rssConfig, NEWS_TTL_MS, PARTIAL_FAIL_TTL_MS, cacheKeys } from "@/shared/config";
import type { NewsItem, NewsCategory } from "@/shared/types";
import type { AppContext } from "@/server/context";
import { ValidationError } from "@/server/core/errors";
import { createSource } from "@/server/core/source";
import { FEED_ACCEPT, parseFeed } from "@/server/parsers/rss";

const VALID_CATEGORIES = new Set(Object.keys(rssConfig));
const MAX_TOTAL = 50;

function deduplicateBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pubDateMs(pubDate: string): number {
  return new Date(pubDate).getTime() || 0;
}

export const getNews = createSource<{ category: NewsCategory }, NewsItem[]>({
  cacheKey: (p) => cacheKeys.news(p.category),
  defaultTtl: NEWS_TTL_MS,
  fetch: async (ctx: AppContext, params) => {
    const category = params.category;
    if (!VALID_CATEGORIES.has(category)) {
      throw new ValidationError(
        `Invalid news category "${category}". Valid: ${Array.from(VALID_CATEGORIES).join(", ")}`,
      );
    }
    const urls = rssConfig[category];
    const results = await Promise.allSettled(
      urls.map(async (url) =>
        parseFeed(await ctx.http.text(url, { headers: { accept: FEED_ACCEPT } }), url),
      ),
    );
    const allItems: NewsItem[] = [];
    let failCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") allItems.push(...r.value);
      else failCount++;
    }
    if (failCount === results.length && results.length > 0)
      throw new Error(`All ${results.length} RSS feed(s) for "${category}" failed`);
    allItems.sort((a, b) => pubDateMs(b.pubDate) - pubDateMs(a.pubDate));
    const unique = deduplicateBy(
      deduplicateBy(allItems, (i) => i.link),
      (i) => i.title.toLowerCase().trim(),
    );
    return { data: unique.slice(0, MAX_TOTAL), ttl: failCount > 0 ? PARTIAL_FAIL_TTL_MS : NEWS_TTL_MS };
  },
});
