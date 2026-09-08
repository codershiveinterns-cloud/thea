/**
 * Feed ingestion: fetch RSS/Atom feeds, validate every item with Zod, classify the source.
 * Feed URLs live in Setting FEED_URLS (one per line) so they can be changed without a deploy.
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { FeedItem, FeedSource } from "../extract";
import { htmlToText } from "../extract";

export const DEFAULT_FEED_URLS = [
  // Windows 11 update history hub (HTML): "Month d, yyyy—KBxxxxxxx (OS Build …)" links
  "https://support.microsoft.com/en-us/help/5018680",
  // Windows release health known issues (HTML table) for the current version
  "https://learn.microsoft.com/en-us/windows/release-health/status-windows-11-25h2",
  // Windows Insider blog (RSS): new builds, what's new
  "https://blogs.windows.com/windows-insider/feed/",
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

const cellText = (html: string) => htmlToText(html).replace(/\s+/g, " ").trim();

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href.replace(/&amp;/g, "&"), base).toString();
  } catch {
    return "";
  }
}

/**
 * Microsoft publishes no RSS for the update-history hub or release health, so those pages are
 * scraped into the same FeedItem shape:
 * - update-history: every "<Month> <d>, <yyyy>—KB<n> (OS Build <b>)" link becomes an item pointing at the KB article.
 * - release-health: every known-issue table row (summary cell + "OS Build … KB… date" cell) becomes an item.
 */
export function parseHtmlSource(html: string, pageUrl: string, source: FeedSource): FeedItem[] {
  const out: FeedItem[] = [];
  const seen = new Set<string>();
  if (source === "update-history") {
    for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]{5,160})<\/a>/gi)) {
      const title = cellText(m[2]);
      const date = /^([A-Z][a-z]+ \d{1,2}, \d{4})\s*[—–-]\s*KB\d{6,7}/.exec(title);
      if (!date) continue;
      const link = resolveUrl(m[1], pageUrl);
      const parsed = itemSchema.safeParse({ title, link, summary: "", published: date[1] });
      if (parsed.success && !seen.has(parsed.data.link)) {
        seen.add(parsed.data.link);
        out.push({ ...parsed.data, source });
      }
    }
  } else if (source === "release-health") {
    for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = Array.from(row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi), (c) => cellText(c[1]));
      const origin = cells.find((c) => /KB\d{6,7}/.test(c) && /OS Build/i.test(c));
      const summary = cells.find((c) => c.length >= 20 && !/OS Build/i.test(c) && !/^\d{4}-\d{2}-\d{2}/.test(c));
      if (!origin || !summary) continue;
      const date = /(\d{4}-\d{2}-\d{2})/.exec(origin)?.[1] ?? null;
      const title = summary.slice(0, 160);
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const parsed = itemSchema.safeParse({ title, link: pageUrl, summary: origin.replace(/(KB\d{6,7})(\d{4}-)/, "$1 $2"), published: date });
      if (parsed.success) out.push({ ...parsed.data, source });
    }
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
        const body = await fetchText(url);
        const source = classifySource(url);
        const isXml = /<(rss|feed)[\s>]/i.test(body.slice(0, 2000));
        const items = isXml ? parseFeed(body, source) : parseHtmlSource(body, url, source);
        if (items.length === 0) return { url, items, error: isXml ? "Feed returned no parseable items" : "Page had no recognisable update/issue entries" };
        return { url, items };
      } catch (err) {
        return { url, items: [], error: (err as Error).message };
      }
    }),
  );
}
