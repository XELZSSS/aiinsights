import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/shared/types";
import { decodeEntities, stripHtml } from "./html";

/** Cap per-feed items before merging so one noisy feed cannot dominate the response. */
export const MAX_ITEMS_PER_FEED = 50;

/** Accept header for RSS/Atom fetches. */
export const FEED_ACCEPT = "application/rss+xml,application/xml,text/xml,*/*";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function sourceNameFrom(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return "Unknown";
  }
}

function channelTitle(channel: Record<string, unknown>, sourceUrl: string): string {
  const rawTitle = channel.title as string | Record<string, unknown> | undefined;
  const text = typeof rawTitle === "string" ? rawTitle : ((rawTitle?.["#text"] as string | undefined) ?? "");
  return decodeEntities(text) || sourceNameFrom(sourceUrl);
}

function itemLink(item: Record<string, unknown>): string | null {
  const rawLink = item.link;
  if (typeof rawLink === "string") return rawLink;
  const href = (rawLink as Record<string, unknown> | undefined)?.href;
  return typeof href === "string" ? href : null;
}

/**
 * Parse an RSS or Atom feed into normalized news items.
 * An unparseable/garbage feed throws so partial-failure accounting upstream can react to it.
 */
export function parseFeed(xml: string, sourceUrl: string): NewsItem[] {
  const feed = parser.parse(xml);
  const channel: Record<string, unknown> | undefined = feed?.rss?.channel || feed?.feed;
  if (!channel) throw new Error(`Unrecognized feed format at ${sourceUrl}`);

  let items = channel.item || channel.entry || [];
  if (!Array.isArray(items)) items = [items];

  const source = channelTitle(channel, sourceUrl);
  return (items as Record<string, unknown>[])
    .slice(0, MAX_ITEMS_PER_FEED)
    .map((item) => {
      const link = itemLink(item);
      const title = item.title;
      if (!title || !link) return null;
      return {
        id: String((item.guid as Record<string, unknown>)?.["#text"] || item.guid || item.id || link),
        title: decodeEntities(stripHtml(String(title))),
        link: String(link),
        pubDate: String(item.pubDate || item.published || item.updated || "1970-01-01T00:00:00Z"),
        source,
      };
    })
    .filter((x: NewsItem | null): x is NewsItem => x !== null);
}
