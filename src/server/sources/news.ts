import { XMLParser } from "fast-xml-parser";
import { rssConfig, NEWS_TTL_MS, PARTIAL_FAIL_TTL_MS, cacheKeys } from "@/shared/config";
import type { NewsItem, NewsCategory } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { ValidationError } from "@/server/core/errors";
import { createSource } from "@/server/core/source";
import { decodeEntities, stripHtml } from "@/server/parsers/html";

const VALID_CATEGORIES = new Set(Object.keys(rssConfig));
const MAX_ITEMS_PER_FEED = 50;
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

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function parseFeed(xml: string, sourceUrl: string): NewsItem[] {
  const feed = parser.parse(xml);
  const channel = feed?.rss?.channel || feed?.feed;
  if (!channel) return [];
  const rawTitle = channel.title;
  const sourceName =
    decodeEntities(typeof rawTitle === "string" ? rawTitle : ((rawTitle?.["#text"] as string | undefined) ?? "")) ||
    (() => {
      try {
        return new URL(sourceUrl).hostname;
      } catch {
        return "Unknown";
      }
    })();
  let items = channel.item || channel.entry || [];
  if (!Array.isArray(items)) items = [items];
  return items
    .slice(0, MAX_ITEMS_PER_FEED)
    .map((item: Record<string, unknown>) => {
      const title = item.title;
      const rawLink = item.link;
      const link = typeof rawLink === "string" ? rawLink : (rawLink as Record<string, unknown>)?.href;
      if (!title || !link) return null;
      return {
        id: String((item.guid as Record<string, unknown>)?.["#text"] || item.guid || item.id || link),
        title: decodeEntities(stripHtml(String(title))),
        link: String(link),
        pubDate: String(item.pubDate || item.published || item.updated || "1970-01-01T00:00:00Z"),
        source: String(sourceName),
      };
    })
    .filter((x: NewsItem | null): x is NewsItem => x !== null);
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
        parseFeed(
          await ctx.http.text(url, { headers: { accept: "application/rss+xml,application/xml,text/xml,*/*" } }),
          url,
        ),
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
    allItems.sort((a, b) => {
      const ta = new Date(a.pubDate).getTime() || 0;
      const tb = new Date(b.pubDate).getTime() || 0;
      return tb - ta;
    });
    const unique = deduplicateBy(
      deduplicateBy(allItems, (i) => i.link),
      (i) => i.title.toLowerCase().trim(),
    );
    return { data: unique.slice(0, MAX_TOTAL), ttl: failCount > 0 ? PARTIAL_FAIL_TTL_MS : NEWS_TTL_MS };
  },
});
