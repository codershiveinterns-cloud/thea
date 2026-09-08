/**
 * Pipeline orchestrator (CLAUDE.md "Pipeline" steps 1–9).
 * Called by `npm run generate`, the scheduler, /api/cron/generate and the admin button.
 */
import { db } from "@/lib/db";
import { CATEGORY_SLUGS, POSTS_PER_DAY_MAX, SETTING_KEYS, categoryBySlug, type CategorySlug } from "@/lib/constants";
import { describeAi } from "@/lib/ai";
import { pingIndexNow } from "@/lib/indexing";
import { suggestRelatedPosts } from "@/lib/post-utils";
import { ogImagePath } from "@/lib/seo";
import { getAllSettings, settingBool, settingInt } from "@/lib/settings";
import { slugify } from "@/lib/slug";
import { extractIdentifiers, keywordsFromItem, type FeedItem, type Identifiers } from "./extract";
import { generatePost, type GeneratedPost } from "./generate";
import { RunLog, type PipelineReport, type PostOutcome } from "./log";
import { decidePublish, qualityGate } from "./quality";
import { buildSourceUrls, research } from "./research";
import { loadSelection, pickAuthor, type SelectableKeyword } from "./select";
import { DEFAULT_FEED_URLS, fetchFeeds } from "./sources/feeds";

export type RunOptions = {
  /** Generate and validate but write nothing to the DB. */
  dryRun?: boolean;
  /** Override POSTS_PER_DAY for this run. */
  limit?: number;
  /** Generate for one specific keyword id (skips selection rules). */
  keywordId?: string;
  /** Skip feed ingestion (e.g. the scheduler already ingested this morning). */
  skipIngest?: boolean;
  /** Ingest feeds, queue keywords, then stop. */
  ingestOnly?: boolean;
  quiet?: boolean;
};

export function feedUrlsFromSetting(value: string): string[] {
  const lines = value.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
  return lines.length ? lines : DEFAULT_FEED_URLS;
}

// ---------- step 1: ingest ----------

/** Only feed items newer than this become keywords — the site covers what shipped this week, not the archive. */
export const INGEST_MAX_AGE_DAYS = 14;
/** Safety cap so one run can't flood the keyword queue. */
export const INGEST_MAX_NEW_KEYWORDS = 20;

export async function ingest(feedUrls: string[], log: RunLog, dryRun: boolean): Promise<{ feeds: PipelineReport["ingest"]["feeds"]; newKeywords: number; items: FeedItem[] }> {
  const results = await fetchFeeds(feedUrls);
  const feeds = results.map((r) => ({ url: r.url, items: r.items.length, error: r.error }));
  for (const f of feeds) log[f.error ? "warn" : "info"]("ingest", `${f.url}: ${f.items} items${f.error ? ` (${f.error})` : ""}`);
  const cutoff = Date.now() - INGEST_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const all = results.flatMap((r) => r.items);
  // Same-day coverage: only recent items become keywords. Undated items are kept (some feeds omit dates).
  const items = all.filter((it) => !it.published || it.published.getTime() >= cutoff).sort((a, b) => (b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0));
  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const catId = (slug: string) => categories.find((c) => c.slug === slug)?.id;
  const existing = new Set((await db.keyword.findMany({ select: { phrase: true } })).map((k) => k.phrase.toLowerCase()));
  let created = 0;
  outer: for (const item of items) {
    for (const cand of keywordsFromItem(item)) {
      if (created >= INGEST_MAX_NEW_KEYWORDS) break outer;
      const key = cand.phrase.toLowerCase();
      if (existing.has(key)) continue;
      const categoryId = catId(cand.categorySlug);
      if (!categoryId) continue;
      existing.add(key);
      created++;
      if (!dryRun) await db.keyword.create({ data: { phrase: cand.phrase, categoryId, source: "FEED", status: "QUEUED" } });
    }
  }
  log.info("ingest", `${all.length} feed items, ${items.length} from the last ${INGEST_MAX_AGE_DAYS} days → ${created} new keyword${created === 1 ? "" : "s"}${dryRun ? " (dry run, not saved)" : ""}`);
  return { feeds, newKeywords: created, items };
}

// ---------- helpers ----------

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "post";
  let slug = root;
  for (let i = 2; i < 50; i++) {
    if (!(await db.post.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

function feedLinkFor(phrase: string, items: FeedItem[]): { link: string | null; identifiers: Identifiers } {
  const ids = extractIdentifiers(phrase);
  const norm = (s: string) => s.toLowerCase();
  const hit = items.find((it) => {
    const t = norm(`${it.title} ${it.summary}`);
    return ids.kb.some((k) => t.includes(norm(k))) || ids.builds.some((b) => t.includes(b)) || ids.errorCodes.some((c) => t.includes(c)) || norm(it.title) === norm(phrase);
  });
  return { link: hit?.link ?? null, identifiers: hit ? extractIdentifiers(`${hit.title}\n${hit.summary}\n${phrase}`) : ids };
}

async function resolveInternalLinks(suggestions: string[], categoryId: string, limit = 5): Promise<string[]> {
  const candidates = await db.post.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, categoryId: true, status: true } });
  const ids: string[] = [];
  for (const s of suggestions) {
    for (const c of suggestRelatedPosts({ title: s, categoryId }, candidates, 2)) {
      if (!ids.includes(c.id)) ids.push(c.id);
      if (ids.length >= limit) return ids;
    }
  }
  if (ids.length < 3) {
    for (const c of suggestRelatedPosts({ title: suggestions.join(" "), categoryId }, candidates, limit)) {
      if (!ids.includes(c.id)) ids.push(c.id);
      if (ids.length >= limit) break;
    }
  }
  return ids;
}

// ---------- steps 3–9 for one keyword ----------

async function processKeyword(kw: SelectableKeyword, ctx: { items: FeedItem[]; autoPublish: boolean; dryRun: boolean; lastAuthorId: string | null; log: RunLog; usage: PipelineReport["usage"] }): Promise<PostOutcome & { authorId: string | null }> {
  const { log } = ctx;
  const base: PostOutcome & { authorId: string | null } = { keywordId: kw.id, phrase: kw.phrase, categorySlug: kw.categorySlug, status: "FAILED", postId: null, title: null, qualityScore: null, flaggedIdentifiers: [], error: null, authorId: null };
  const category = categoryBySlug(kw.categorySlug);
  if (!category) return { ...base, error: `Unknown category ${kw.categorySlug}` };

  // 3. author
  const authors = await db.author.findMany({ select: { id: true, name: true, stylePrompt: true, categoryFocus: true } });
  const author = pickAuthor(authors, kw.categorySlug, ctx.lastAuthorId);
  if (!author) return { ...base, error: "No authors in the database" };
  base.authorId = author.id;
  log.info("assign", `"${kw.phrase}" → ${author.name}`);

  // 4. research
  const { link, identifiers } = feedLinkFor(kw.phrase, ctx.items);
  const urls = buildSourceUrls({ phrase: kw.phrase, link, identifiers });
  const res = await research(urls);
  for (const s of res.sources) log[s.ok ? "info" : "warn"]("research", `${s.url}: ${s.ok ? `${s.text.length} chars` : s.error}`);
  if (res.urls.length === 0) return { ...base, error: "No source pages could be fetched — refusing to generate without facts" };

  // 5. generate
  const existingTitles = (await db.post.findMany({ where: { status: "PUBLISHED" }, select: { title: true }, orderBy: { publishedAt: "desc" }, take: 40 })).map((p) => p.title);
  let post: GeneratedPost;
  try {
    const g = await generatePost({ phrase: kw.phrase, categorySlug: kw.categorySlug, categoryName: category.name, author, sourcesText: res.combinedText, existingTitles });
    post = g.post;
    ctx.usage.inputTokens += g.usage.inputTokens;
    ctx.usage.outputTokens += g.usage.outputTokens;
  } catch (err) {
    return { ...base, error: `Generation failed: ${(err as Error).message}` };
  }
  base.title = post.title;
  log.info("generate", `"${post.title}" (${post.body.split(/\s+/).length} words, ${post.faq.length} FAQ)`);

  // 6. quality gate
  let quality;
  try {
    quality = await qualityGate(post, res.combinedText);
    ctx.usage.inputTokens += quality.usage.inputTokens;
    ctx.usage.outputTokens += quality.usage.outputTokens;
  } catch (err) {
    return { ...base, error: `Quality gate failed: ${(err as Error).message}` };
  }
  base.qualityScore = quality.score;
  base.flaggedIdentifiers = quality.flaggedIdentifiers;
  log[quality.passes ? "info" : "warn"]("quality", `score ${quality.score}${quality.flaggedIdentifiers.length ? `, unsupported identifiers: ${quality.flaggedIdentifiers.join(", ")}` : ""}`);

  // 9. publish decision
  const status = decidePublish({ autoPublish: ctx.autoPublish, score: quality.score, flaggedIdentifiers: quality.flaggedIdentifiers });
  if (ctx.dryRun) {
    log.info("publish", `dry run — would create as ${status}`);
    console.log(JSON.stringify({ ...post, qualityScore: quality.score, qualityNotes: quality.notes, status }, null, 2));
    return { ...base, status: "DRY_RUN" };
  }

  // 7. internal links, 8. featured image, create
  const relatedIds = await resolveInternalLinks(post.internalLinkSuggestions, kw.categoryId);
  const slug = await uniqueSlug(post.slug || post.title);
  const now = new Date();
  const created = await db.post.create({
    data: {
      title: post.title,
      slug,
      categoryId: kw.categoryId,
      authorId: author.id,
      status,
      quickAnswer: post.quickAnswer,
      body: post.body,
      affectedBuilds: post.affectedBuilds,
      faq: post.faq,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      featuredImage: ogImagePath(post.title, kw.categorySlug),
      screenshots: [],
      sourceUrls: res.urls,
      qualityScore: quality.score,
      qualityNotes: quality.notes,
      generatedBy: "AI",
      publishedAt: status === "PUBLISHED" ? now : null,
      relatedPosts: { connect: relatedIds.map((id) => ({ id })) },
    },
    select: { id: true },
  });
  await db.keyword.update({ where: { id: kw.id }, data: { status: "USED" } });
  log.info("publish", `${status}: /admin/posts/${created.id} (${relatedIds.length} internal links)`);

  if (status === "PUBLISHED") {
    const path = `/${kw.categorySlug}/${slug}`;
    try {
      const { revalidatePublicSite } = await import("@/lib/revalidate");
      revalidatePublicSite();
    } catch {
      /* not inside a Next request (CLI/scheduler) — pages refresh on their hourly revalidate */
    }
    const ping = await pingIndexNow([path]);
    log.info("indexing", ping.detail);
  }
  return { ...base, status, postId: created.id };
}

// ---------- entry point ----------

export async function runPipeline(opts: RunOptions = {}): Promise<PipelineReport> {
  const log = new RunLog(!opts.quiet);
  const startedAt = new Date().toISOString();
  const settings = await getAllSettings();
  const perDay = Math.min(POSTS_PER_DAY_MAX, Math.max(1, opts.limit ?? settingInt(settings.POSTS_PER_DAY, 2)));
  const autoPublish = settingBool(settings.AUTO_PUBLISH);
  const dryRun = Boolean(opts.dryRun);
  const usage = { inputTokens: 0, outputTokens: 0 };
  const posts: PostOutcome[] = [];
  let ingestReport: PipelineReport["ingest"] = { feeds: [], newKeywords: 0 };
  let items: FeedItem[] = [];

  log.info("run", `AI ${describeAi()} · posts per run ${perDay}, auto-publish ${autoPublish ? "on" : "off"}${dryRun ? ", DRY RUN" : ""}`);
  try {
    if (!opts.skipIngest) {
      const r = await ingest(feedUrlsFromSetting(settings.FEED_URLS), log, dryRun);
      ingestReport = { feeds: r.feeds, newKeywords: r.newKeywords };
      items = r.items;
    }
    const selected = opts.ingestOnly ? [] : await loadSelection(perDay, opts.keywordId);
    if (!opts.ingestOnly) log.info("select", selected.length ? selected.map((k) => `"${k.phrase}" [${k.categorySlug}]`).join("; ") : "no queued keywords eligible");
    const last = await db.post.findFirst({ where: { generatedBy: "AI" }, orderBy: { createdAt: "desc" }, select: { authorId: true } });
    let lastAuthorId = last?.authorId ?? null;
    for (const kw of selected) {
      try {
        const outcome = await processKeyword(kw, { items, autoPublish, dryRun, lastAuthorId, log, usage });
        if (outcome.authorId) lastAuthorId = outcome.authorId;
        if (outcome.error) log.error("post", `"${kw.phrase}": ${outcome.error}`);
        posts.push(outcome);
      } catch (err) {
        const message = (err as Error).message;
        log.error("post", `"${kw.phrase}": ${message}`);
        posts.push({ keywordId: kw.id, phrase: kw.phrase, categorySlug: kw.categorySlug, status: "FAILED", postId: null, title: null, qualityScore: null, flaggedIdentifiers: [], error: message });
      }
    }
  } catch (err) {
    log.error("run", (err as Error).message);
  }

  const report: PipelineReport = {
    ok: !log.entries.some((e) => e.level === "error"),
    dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    ingest: ingestReport,
    posts,
    usage,
    log: log.entries,
  };
  if (!dryRun) {
    try {
      await db.setting.upsert({ where: { key: SETTING_KEYS.PIPELINE_LAST_RUN }, update: { value: JSON.stringify(report) }, create: { key: SETTING_KEYS.PIPELINE_LAST_RUN, value: JSON.stringify(report) } });
      await appendRunHistory(report);
    } catch (err) {
      log.warn("run", `could not save run report: ${(err as Error).message}`);
    }
  }
  return report;
}

/** Compact per-run record kept for the admin "Recent pipeline runs" list. */
export type RunHistoryEntry = { startedAt: string; finishedAt: string; ok: boolean; summary: string; errors: string[]; created: number };
export const RUN_HISTORY_MAX = 20;

export function pushRunHistory(history: RunHistoryEntry[], entry: RunHistoryEntry, max = RUN_HISTORY_MAX): RunHistoryEntry[] {
  return [entry, ...history].slice(0, max);
}

export function parseRunHistory(raw: string): RunHistoryEntry[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as RunHistoryEntry[]).filter((e) => e && typeof e.finishedAt === "string") : [];
  } catch {
    return [];
  }
}

async function appendRunHistory(report: PipelineReport) {
  const existing = await db.setting.findUnique({ where: { key: SETTING_KEYS.PIPELINE_RUN_HISTORY } });
  const entry: RunHistoryEntry = {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    ok: report.ok,
    summary: summarizeReport(report),
    errors: report.log.filter((e) => e.level === "error").map((e) => `[${e.step}] ${e.message}`).slice(0, 5),
    created: report.posts.filter((p) => p.postId).length,
  };
  const value = JSON.stringify(pushRunHistory(parseRunHistory(existing?.value ?? ""), entry));
  await db.setting.upsert({ where: { key: SETTING_KEYS.PIPELINE_RUN_HISTORY }, update: { value }, create: { key: SETTING_KEYS.PIPELINE_RUN_HISTORY, value } });
}

export function summarizeReport(r: PipelineReport): string {
  const made = r.posts.filter((p) => p.postId).length;
  const failed = r.posts.filter((p) => p.status === "FAILED").length;
  const published = r.posts.filter((p) => p.status === "PUBLISHED").length;
  const parts = [`${r.ingest.newKeywords} new keyword${r.ingest.newKeywords === 1 ? "" : "s"}`];
  if (r.dryRun) parts.push(`${r.posts.filter((p) => p.status === "DRY_RUN").length} generated (dry run)`);
  else parts.push(`${made} post${made === 1 ? "" : "s"} created (${published} published, ${made - published} in review)`);
  if (failed) parts.push(`${failed} failed`);
  return parts.join(", ") + ".";
}

export function isCategorySlug(s: string): s is CategorySlug {
  return (CATEGORY_SLUGS as string[]).includes(s);
}
