/**
 * Re-verification: published guides whose last verification is older than REVERIFY_AFTER_DAYS
 * are listed weekly (scheduler + dashboard). "Refresh" regenerates the body against fresh
 * sources and moves the post to REVIEW so a human re-checks it before it goes live again.
 */
import { db } from "@/lib/db";
import { REVERIFY_AFTER_DAYS } from "@/lib/constants";
import { readStringArray } from "@/lib/validation";
import { generatePost } from "./generate";
import { qualityGate } from "./quality";
import { buildSourceUrls, research } from "./research";

export function reverifyCutoff(now = new Date(), days = REVERIFY_AFTER_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Published posts last verified (or, if never verified, published) before the cutoff. Oldest first. */
export async function listDueForReverification(take = 20, now = new Date()) {
  const cutoff = reverifyCutoff(now);
  return db.post.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ lastVerifiedAt: { lt: cutoff } }, { lastVerifiedAt: null, publishedAt: { lt: cutoff } }],
    },
    select: { id: true, title: true, slug: true, publishedAt: true, lastVerifiedAt: true, updatedAt: true, category: { select: { name: true, slug: true } } },
    orderBy: [{ lastVerifiedAt: "asc" }, { publishedAt: "asc" }],
    take,
  });
}

export type RefreshResult = { postId: string; score: number; sourceCount: number; flaggedIdentifiers: string[] };

/**
 * Regenerate body, quick answer, FAQ and affected builds from freshly fetched sources.
 * Title, slug, meta title/description, screenshots and author are kept. Status → REVIEW.
 */
export async function refreshPostFromSources(postId: string): Promise<RefreshResult> {
  const post = await db.post.findUnique({ where: { id: postId }, include: { author: true, category: true } });
  if (!post) throw new Error("Post not found");

  const stored = readStringArray(post.sourceUrls);
  const urls = buildSourceUrls({ phrase: post.title, extra: stored });
  const sources = await research(urls);
  if (sources.urls.length === 0) throw new Error("No source pages could be fetched — refusing to regenerate without facts");

  const existingTitles = (await db.post.findMany({ where: { status: "PUBLISHED", NOT: { id: postId } }, select: { title: true }, orderBy: { publishedAt: "desc" }, take: 40 })).map((p) => p.title);
  const { post: generated } = await generatePost({
    phrase: post.title,
    categorySlug: post.category.slug,
    categoryName: post.category.name,
    author: { name: post.author.name, stylePrompt: post.author.stylePrompt },
    sourcesText: sources.combinedText,
    existingTitles,
  });
  const quality = await qualityGate(generated, sources.combinedText);

  await db.post.update({
    where: { id: postId },
    data: {
      status: "REVIEW",
      quickAnswer: generated.quickAnswer,
      body: generated.body,
      faq: generated.faq,
      affectedBuilds: generated.affectedBuilds,
      sourceUrls: sources.urls,
      qualityScore: quality.score,
      qualityNotes: `Refreshed ${new Date().toISOString().slice(0, 10)} against fresh sources.\n${quality.notes}`,
      generatedBy: "AI",
    },
  });
  return { postId, score: quality.score, sourceCount: sources.urls.length, flaggedIdentifiers: quality.flaggedIdentifiers };
}
