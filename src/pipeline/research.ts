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

/** Ordered, de-duplicated candidate URLs: KB articles → feed item → topic references. Pure. */
export function buildSourceUrls(input: { phrase: string; link?: string | null; identifiers?: Identifiers; extra?: string[] }): string[] {
  const ids = input.identifiers ?? extractIdentifiers(input.phrase);
  const urls: string[] = [];
  for (const kb of ids.kb) urls.push(`https://support.microsoft.com/help/${kb.replace(/^KB/i, "")}`);
  if (input.link) urls.push(input.link);
  for (const u of input.extra ?? []) urls.push(u);
  if (ids.errorCodes.length) urls.push(OFFICIAL.updateErrorReference);
  urls.push(OFFICIAL.releaseHealth);
  if (urls.length < 3) urls.push(OFFICIAL.windowsSupport);
  return Array.from(new Set(urls.filter((u) => /^https?:\/\//.test(u)))).slice(0, MAX_SOURCES);
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
  const combinedText = good.map((s) => `SOURCE: ${s.url}\n${s.text}`).join("\n\n-----\n\n");
  return { sources, combinedText, urls: good.map((s) => s.url) };
}
