/**
 * Research step: fetch 3–5 source pages (official docs first), extract plain text.
 * The generator may only state facts present in these texts.
 */
import { extractIdentifiers, htmlToText, type Identifiers } from "./extract";
import { fetchText } from "./sources/feeds";

export const MAX_SOURCES = 5;
export const MIN_SOURCES = 1;
const MAX_CHARS_PER_SOURCE = 12000;

const OFFICIAL = {
  releaseHealth: "https://learn.microsoft.com/en-us/windows/release-health/",
  updateErrorReference: "https://learn.microsoft.com/en-us/windows/deployment/update/windows-update-error-reference",
  windowsSupport: "https://support.microsoft.com/en-us/windows",
};

/**
 * Ordered, de-duplicated candidate URLs. KB articles first, then official pages found by search
 * (evergreen keywords), then the feed item and any stored extras. The generic reference pages are
 * only added when nothing official was found. Pure.
 */
export function buildSourceUrls(input: { phrase: string; link?: string | null; identifiers?: Identifiers; extra?: string[]; official?: string[] }): string[] {
  const ids = input.identifiers ?? extractIdentifiers(input.phrase);
  const urls: string[] = [];
  for (const kb of ids.kb) urls.push(`https://support.microsoft.com/help/${kb.replace(/^KB/i, "")}`);
  for (const u of input.official ?? []) urls.push(u);
  if (input.link) urls.push(input.link);
  for (const u of input.extra ?? []) urls.push(u);
  const hasOfficial = ids.kb.length > 0 || (input.official?.length ?? 0) > 0;
  if (!hasOfficial) {
    if (ids.errorCodes.length) urls.push(OFFICIAL.updateErrorReference);
    urls.push(OFFICIAL.releaseHealth);
    if (urls.length < 3) urls.push(OFFICIAL.windowsSupport);
  }
  return Array.from(new Set(urls.filter((u) => /^https?:\/\//.test(u)))).slice(0, MAX_SOURCES);
}

/**
 * Pull the "Improvements" and "Known issues" sections out of a support.microsoft.com KB article's text.
 * Section boundaries are the article's own headings; returns null for a section that is not present. Pure.
 */
export function extractKbSections(text: string): { improvements: string | null; knownIssues: string | null } {
  const lines = text.split(/\r?\n/);
  const isHeading = (l: string, re: RegExp) => re.test(l.trim()) && l.trim().length < 80;
  const start = (re: RegExp) => lines.findIndex((l) => isHeading(l, re));
  const STOP = /^(how to get this update|file information|references|need more help|want more options|summary)/i;
  const grab = (from: number, endRes: RegExp[]) => {
    if (from < 0) return null;
    const out: string[] = [];
    for (let i = from + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (endRes.some((re) => isHeading(l, re)) || isHeading(l, STOP)) break;
      if (l) out.push(l);
    }
    const body = out.join("\n").trim();
    return body.length > 20 ? body.slice(0, 8000) : null;
  };
  const improvements = grab(start(/^(improvements|highlights)$/i), [/^known issues/i]);
  const knownIssues = grab(start(/^known issues( in this update)?$/i), [/^(improvements|highlights)$/i]);
  return { improvements, knownIssues };
}

export function isKbArticleUrl(url: string): boolean {
  return /support\.microsoft\.com\/(?:[a-z-]+\/)?(?:help|topic)\/\d{6,7}|support\.microsoft\.com\/.*kb\d{6,7}/i.test(url);
}

export type ResearchSource = { url: string; text: string; ok: boolean; error?: string };
export type ResearchResult = { sources: ResearchSource[]; combinedText: string; urls: string[] };

export async function research(urls: string[]): Promise<ResearchResult> {
  const sources = await Promise.all(
    urls.map(async (url): Promise<ResearchSource> => {
      try {
        const html = await fetchText(url, 20000);
        const text = htmlToText(html).slice(0, MAX_CHARS_PER_SOURCE);
        if (text.length < 200) return { url, text: "", ok: false, error: "Page had no readable text" };
        return { url, text, ok: true };
      } catch (err) {
        return { url, text: "", ok: false, error: (err as Error).message };
      }
    }),
  );
  const good = sources.filter((s) => s.ok);
  // KB articles: surface Improvements + Known issues first so the generator's Highlights come from them.
  const kbBlocks = good
    .filter((s) => isKbArticleUrl(s.url))
    .map((s) => {
      const { improvements, knownIssues } = extractKbSections(s.text);
      if (!improvements && !knownIssues) return "";
      return `KB ARTICLE SECTIONS (${s.url})\nIMPROVEMENTS:\n${improvements ?? "(none listed)"}\n\nKNOWN ISSUES:\n${knownIssues ?? "(Microsoft lists no known issues)"}`;
    })
    .filter(Boolean);
  const combinedText = [...kbBlocks, ...good.map((s) => `SOURCE: ${s.url}\n${s.text}`)].join("\n\n-----\n\n");
  return { sources, combinedText, urls: good.map((s) => s.url) };
}
