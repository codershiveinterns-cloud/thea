/**
 * Evergreen research: for keywords without a KB number, find official Microsoft pages for the
 * exact error code or feature name via the Microsoft Learn search API (covers learn.microsoft.com
 * and, when indexed, support.microsoft.com). Pure ranking so it can be unit-tested with a fake fetch.
 */
import { extractIdentifiers } from "./extract";

export const OFFICIAL_HOSTS = ["learn.microsoft.com", "support.microsoft.com"];
export const MAX_OFFICIAL_SOURCES = 3;

export type SearchResult = { title: string; url: string };

const GENERIC = /\b(how|to|fix|fixes|fixing|error|in|on|for|the|a|an|windows|11|10|after|update|updates|not|working|guide|solved)\b/gi;

/** The search term: the exact error code if present, otherwise the feature/app phrase. Pure. */
export function evergreenQuery(phrase: string): { query: string; tokens: string[] } {
  const ids = extractIdentifiers(phrase);
  if (ids.errorCodes.length) return { query: `"${ids.errorCodes[0]}" Windows 11`, tokens: [ids.errorCodes[0]] };
  const feature = phrase.replace(GENERIC, " ").replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = feature.toLowerCase().split(" ").filter((t) => t.length > 2);
  return { query: `${feature || phrase} Windows 11`, tokens };
}

const OFF_TOPIC = /(visualstudio|copilot-studio|microsoft-teams|\/teams\/|power-platform|power-bi|microsoft-365|fabric|azure|dynamics|dotnet|\/sql\/|xbox|surface-hub|windows-hardware|\/office\/|\/graph\/|\/entra\/|\/intune\/)/i;
const ON_TOPIC = /learn\.microsoft\.com\/[a-z-]+\/(windows\/|troubleshoot\/)|support\.microsoft\.com/i;

/** Landing/hub pages (…/windows/, …/windows/resources/) never name the specific problem. */
function isHubPage(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/^\/[a-z]{2}-[a-z]{2}/i, "");
    const segments = path.split("/").filter(Boolean);
    return path.endsWith("/") || segments.length <= 1;
  } catch {
    return true;
  }
}

/**
 * Score and pick the best official pages for the phrase. A page must mention the search term
 * (error code or feature word) in its title or URL; Windows / troubleshooting paths score higher,
 * other Microsoft products and hub pages lower. Pure.
 */
export function rankOfficialResults(results: SearchResult[], phrase: string, max = MAX_OFFICIAL_SOURCES): string[] {
  const { tokens } = evergreenQuery(phrase);
  const scored = results
    .filter((r) => {
      try {
        return OFFICIAL_HOSTS.includes(new URL(r.url).hostname.replace(/^www\./, ""));
      } catch {
        return false;
      }
    })
    .map((r) => {
      const hay = `${r.title} ${r.url}`.toLowerCase();
      const matches = tokens.filter((t) => hay.includes(t.toLowerCase())).length;
      let score = matches * 2;
      if (ON_TOPIC.test(r.url)) score += 2;
      if (OFF_TOPIC.test(r.url)) score -= 3;
      if (isHubPage(r.url)) score -= 4;
      if (/\/windows\/release-health\//i.test(r.url)) score += 1;
      return { url: r.url, score, matches };
    })
    .filter((r) => r.matches > 0 && r.score > 0)
    .sort((a, b) => b.score - a.score);
  const out: string[] = [];
  for (const r of scored) {
    if (!out.includes(r.url)) out.push(r.url);
    if (out.length >= max) break;
  }
  return out;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Top official pages for an evergreen keyword, or [] when the search fails or finds nothing relevant. */
export async function searchMicrosoft(phrase: string, fetchFn: FetchLike = fetch): Promise<string[]> {
  const { query } = evergreenQuery(phrase);
  const url = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query)}&locale=en-us&$top=10`;
  try {
    const res = await fetchFn(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; TheaBot/1.0)" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: unknown };
    const results = Array.isArray(json.results)
      ? (json.results as Record<string, unknown>[]).filter((r) => typeof r.url === "string" && typeof r.title === "string").map((r) => ({ title: String(r.title), url: String(r.url) }))
      : [];
    return rankOfficialResults(results, phrase);
  } catch {
    return [];
  }
}
