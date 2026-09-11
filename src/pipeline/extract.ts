/**
 * Pure text helpers: pull Windows identifiers out of feed items and turn items into
 * keyword candidates. No I/O, fully unit-tested. Identifiers are only ever COPIED from
 * source text — nothing here invents a KB, build or error code.
 */
import type { CategorySlug } from "@/lib/constants";

export type Identifiers = { kb: string[]; builds: string[]; errorCodes: string[]; versions: string[] };

const KB_RE = /\bKB\s?(\d{6,7})\b/gi;
const BUILD_RE = /\b(?:10\.0\.)?(1[0-9]{4}|2[0-9]{4})\.(\d{1,5})\b/g;
const ERROR_RE = /\b0x[0-9a-f]{8}\b/gi;
const VERSION_RE = /\b(2[2-9]H[12])\b/gi;

function uniq(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function extractIdentifiers(text: string): Identifiers {
  const kb = uniq(Array.from(text.matchAll(KB_RE), (m) => `KB${m[1]}`));
  const builds = uniq(Array.from(text.matchAll(BUILD_RE), (m) => `${m[1]}.${m[2]}`));
  const errorCodes = uniq(Array.from(text.matchAll(ERROR_RE), (m) => m[0].toLowerCase()));
  const versions = uniq(Array.from(text.matchAll(VERSION_RE), (m) => m[1].toUpperCase()));
  return { kb, builds, errorCodes, versions };
}

export type FeedSource = "update-history" | "release-health" | "insider" | "other";

export type FeedItem = {
  title: string;
  link: string;
  summary: string;
  published: Date | null;
  source: FeedSource;
};

export type KeywordCandidate = {
  phrase: string;
  categorySlug: CategorySlug;
  identifiers: Identifiers;
  /** The feed item this came from — becomes the first research source. */
  link: string;
};

const FEATURE_WORDS = /^(introducing|improving|new |a new |bringing|expanding|now available|coming soon)/i;
const PROBLEM_WORDS = /\b(fail|fails|failed|failing|not install|won't install|stuck|error|issue|issues|problem|crash|crashes|broken|breaks|bug|rollback|rolls back)\b/i;

function cleanTitle(t: string): string {
  return t.replace(/\s+/g, " ").replace(/[—–]\s*/g, "— ").trim();
}

/**
 * Derive keyword phrases from one feed item. Rules mirror the categories in CLAUDE.md:
 * - Insider "Announcing … Build 26200.xxxx" → windows-updates ("What's new in …")
 * - Update-history "Month d, yyyy—KB… (OS Build …)" → windows-updates + update-problems
 * - Any error code in the text → error-codes ("How to fix error 0x… in Windows 11")
 * - Release-health "known issue"/problem wording → update-problems
 */
export function keywordsFromItem(item: FeedItem): KeywordCandidate[] {
  const text = `${item.title}\n${item.summary}`;
  const ids = extractIdentifiers(text);
  const titleIds = extractIdentifiers(item.title);
  const out: KeywordCandidate[] = [];
  const push = (phrase: string, categorySlug: CategorySlug) => {
    if (!out.some((o) => o.phrase.toLowerCase() === phrase.toLowerCase())) {
      out.push({ phrase, categorySlug, identifiers: ids, link: item.link });
    }
  };

  const build = titleIds.builds[0] ?? ids.builds[0];
  const kb = titleIds.kb[0] ?? ids.kb[0];
  const version = titleIds.versions[0] ?? ids.versions[0];

  if (item.source === "insider" && /insider preview build/i.test(item.title) && build) {
    const channel = /\(([^)]*channel[^)]*)\)/i.exec(item.title)?.[1];
    push(`What's new in Windows 11 Insider Preview Build ${build}${channel ? ` (${channel})` : ""}`, "windows-updates");
  } else if (item.source === "insider" && /announcing new (?:[a-z ]+ )?builds? for/i.test(item.title)) {
    // "Announcing new builds for 31 August 2026" — build numbers live in the body/page, not the title.
    if (ids.builds.length) {
      for (const b of ids.builds.slice(0, 2)) push(`What's new in Windows 11 Insider Preview Build ${b}`, "windows-updates");
    } else {
      const date = /builds? for (.+)$/i.exec(item.title)?.[1]?.trim();
      if (date) push(`What's new in the Windows 11 Insider builds for ${date}`, "windows-updates");
    }
  } else if (item.source === "insider" && /releasing windows 11/i.test(item.title) && version) {
    push(`What's new in Windows 11 ${version}`, "windows-updates");
  } else if (kb) {
    push(`What's new in ${kb}${build ? ` (Windows 11 build ${build})` : version ? ` for Windows 11 ${version}` : ""}`, "windows-updates");
    // Only queue a "not installing" post when the update-history entry's own text signals a real
    // problem (e.g. "known issue", "may fail"). Every routine KB used to get this speculative post
    // even when Microsoft reported no install issues — near-duplicate content across releases that
    // never had a problem. Genuine known issues are still captured below from release-health text.
    if (PROBLEM_WORDS.test(text)) {
      push(`${kb} not installing or stuck in Windows 11`, "update-problems");
    }
  } else if (item.source === "release-health" || PROBLEM_WORDS.test(item.title)) {
    push(cleanTitle(item.title).slice(0, 140), "update-problems");
  } else if (item.source === "update-history" && version) {
    push(`What's new in Windows 11 ${version}`, "windows-updates");
  } else if (item.source === "insider" && FEATURE_WORDS.test(item.title)) {
    // Feature announcements ("Improving File Explorer …") become how-to guides for that feature.
    push(cleanTitle(item.title).replace(/:.*$/, "").slice(0, 120), "how-to");
  }

  for (const code of ids.errorCodes.slice(0, 3)) {
    push(`How to fix error ${code} in Windows 11`, "error-codes");
  }
  return out;
}

/**
 * Hallucination check: identifiers that appear in generated text but nowhere in the sources.
 * Version labels (24H2) are common knowledge and are not checked.
 */
export function identifiersNotInSources(generated: string, sources: string): string[] {
  const g = extractIdentifiers(generated);
  const s = extractIdentifiers(sources);
  const lower = (list: string[]) => new Set(list.map((x) => x.toLowerCase()));
  const kb = lower(s.kb);
  const builds = lower(s.builds);
  const codes = lower(s.errorCodes);
  return [
    ...g.kb.filter((x) => !kb.has(x.toLowerCase())),
    ...g.builds.filter((x) => !builds.has(x.toLowerCase())),
    ...g.errorCodes.filter((x) => !codes.has(x.toLowerCase())),
  ];
}

/** Crude HTML → text for research pages and feed summaries. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}
