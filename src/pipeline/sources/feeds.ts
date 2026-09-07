/**
 * Feed ingestion: fetch RSS/Atom feeds, validate every item with Zod, classify the source.
 * Feed URLs live in Setting FEED_URLS (one per line) so they can be changed without a deploy.
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { FeedItem, FeedSource } from "../extract";
import { htmlToText } from "../extract";

export const DEFAULT_FEED_URLS = [
  // Windows Insider blog (new builds, what's new)
  "https://blogs.windows.com/windows-insider/feed/",
  // Add the "Get RSS updates" link from the Windows 11 update history page and the
  // Windows release health page in /admin/settings → Feeds.
];

const USER_AGENT = "Mozilla/5.0 (compatible; TheaBot/1.0; +local)";

const itemSchema = z.object({
  title: z.string().trim().min(3),
  link: z.string().trim().url(),
  summary: z.string().default(""),
  published: z.coerce.date().nullable().default(null),
});

export function classifySource(url: string): FeedSource {
  const u = url.toLowerCase();
  if (u.includes("windows-insider") || u.includes("blogs.windows.com")) return "insider";
  if (u.includes("release-health")) return "release-health";
  if (u.includes("support.microsoft.com")) return "update-history";
  return "other";
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return text(o["#text"] ?? o["@_href"] ?? o["href"] ?? "");
  }
  return "";
}

/** Parse RSS 2.0 or Atom XML into validated items. Invalid items are dropped, not thrown. */
export function parseFeed(xml: string, source: FeedSource): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: "#cdata", textNodeName: "#text" });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }
  const rss = doc["rss"] as Record<string, unknown> | undefined;
  const feed = doc["feed"] as Record<string, unknown> | undefined;
  const raw: Record<string, unknown>[] = [];
  if (rss) {
    const channel = rss["channel"] as Record<string, unknown> | undefined;
    const items = channel?.["item"];
    raw.push(...((Array.isArray(items) ? items : items ? [items] : []) as Record<string, unknown>[]));
  } else if (feed) {
    const entries = feed["entry"];
    raw.push(...((Array.isArray(entries) ? entries : entries ? [entries] : []) as Record<string, unknown>[]));
  }
  const cdata = (v: unknown) => (v && typeof v === "object" && "#cdata" in (v as object) ? String((v as Record<string, unknown>)["#cdata"]) : text(v));
  const out: FeedItem[] = [];
  for (const r of raw) {
    const candidate = {
      title: htmlToText(cdata(r["title"])),
      link: text(r["link"]) || text(r["guid"]),
      summary: htmlToText(cdata(r["description"] ?? r["content:encoded"] ?? r["summary"] ?? r["content"])).slice(0, 4000),
      published: text(r["pubDate"] ?? r["published"] ?? r["updated"] ?? r["dc:date"]) || null,
    };
    const parsed = itemSchema.safeParse(candidate);
    if (parsed.success) out.push({ ...parsed.data, source });
  }
  return out;
}

export async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/html;q=0.9, */*;q=0.8" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export type FeedFetchResult = { url: string; items: FeedItem[]; error?: string };

export async function fetchFeeds(urls: string[]): Promise<FeedFetchResult[]> {
  return Promise.all(
    urls.map(async (url) => {
      try {
        const xml = await fetchText(url);
        const items = parseFeed(xml, classifySource(url));
        if (items.length === 0) return { url, items, error: "Feed returned no parseable items" };
        return { url, items };
      } catch (err) {
        return { url, items: [], error: (err as Error).message };
      }
    }),
  );
}
