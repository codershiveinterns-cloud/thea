/** Keyword selection and author assignment. Pure functions + one thin DB loader. */
import { db } from "@/lib/db";
import { readStringArray } from "@/lib/validation";
import { startOfToday } from "@/lib/dates";

export const MAX_PER_CATEGORY_PER_DAY = 2;

export type SelectableKeyword = { id: string; phrase: string; categoryId: string; categorySlug: string; createdAt: Date };

/** Newest first, at most `count`, never more than 2 per category per day (CLAUDE.md: never 3 in one category). Pure. */
export function selectKeywords(queued: SelectableKeyword[], count: number, todayByCategory: Record<string, number>): SelectableKeyword[] {
  const used = { ...todayByCategory };
  const out: SelectableKeyword[] = [];
  for (const k of [...queued].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    if (out.length >= count) break;
    if ((used[k.categorySlug] ?? 0) >= MAX_PER_CATEGORY_PER_DAY) continue;
    out.push(k);
    used[k.categorySlug] = (used[k.categorySlug] ?? 0) + 1;
  }
  return out;
}

export async function loadSelection(count: number, onlyKeywordId?: string): Promise<SelectableKeyword[]> {
  const queued = await db.keyword.findMany({
    where: onlyKeywordId ? { id: onlyKeywordId } : { status: "QUEUED" },
    include: { category: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const todayPosts = await db.post.findMany({ where: { createdAt: { gte: startOfToday() }, generatedBy: "AI" }, select: { category: { select: { slug: true } } } });
  const todayByCategory: Record<string, number> = {};
  for (const p of todayPosts) todayByCategory[p.category.slug] = (todayByCategory[p.category.slug] ?? 0) + 1;
  const list = queued.map((k) => ({ id: k.id, phrase: k.phrase, categoryId: k.categoryId, categorySlug: k.category.slug, createdAt: k.createdAt }));
  return onlyKeywordId ? list : selectKeywords(list, count, todayByCategory);
}

export type AssignableAuthor = { id: string; name: string; stylePrompt: string; categoryFocus: unknown };

/** Random pick among authors whose categoryFocus contains the category; avoids the previous post's author when possible. Pure. */
export function pickAuthor(authors: AssignableAuthor[], categorySlug: string, lastAuthorId: string | null, random: () => number = Math.random): AssignableAuthor | null {
  let pool = authors.filter((a) => readStringArray(a.categoryFocus).includes(categorySlug));
  if (pool.length === 0) pool = authors;
  if (pool.length === 0) return null;
  const withoutLast = pool.filter((a) => a.id !== lastAuthorId);
  const candidates = withoutLast.length > 0 ? withoutLast : pool;
  return candidates[Math.floor(random() * candidates.length)] ?? null;
}
