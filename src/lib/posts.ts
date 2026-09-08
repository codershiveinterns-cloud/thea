/**
 * Read queries for the PUBLIC site. Only PUBLISHED posts are ever returned from here.
 * Admin queries live under src/lib/admin/.
 */
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CATEGORY_SLUGS } from "./constants";

export const postCardSelect = {
  id: true,
  title: true,
  slug: true,
  quickAnswer: true,
  featuredImage: true,
  affectedBuilds: true,
  publishedAt: true,
  updatedAt: true,
  testedOnBuild: true,
  category: { select: { slug: true, name: true } },
  author: { select: { name: true, slug: true, avatar: true } },
} satisfies Prisma.PostSelect;

export type PostCard = Prisma.PostGetPayload<{ select: typeof postCardSelect }>;

const PUBLISHED: Prisma.PostWhereInput = { status: "PUBLISHED", publishedAt: { not: null } };

export async function getPublishedPost(categorySlug: string, slug: string) {
  if (!(CATEGORY_SLUGS as string[]).includes(categorySlug)) return null;
  return db.post.findFirst({
    where: { ...PUBLISHED, slug, category: { slug: categorySlug } },
    include: {
      category: true,
      author: true,
      relatedPosts: { where: PUBLISHED, select: postCardSelect, take: 5 },
    },
  });
}

export async function listPublishedPosts(opts: {
  categorySlug?: string;
  authorSlug?: string;
  take?: number;
  skip?: number;
} = {}) {
  const where: Prisma.PostWhereInput = {
    ...PUBLISHED,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    ...(opts.authorSlug ? { author: { slug: opts.authorSlug } } : {}),
  };
  const [items, total] = await Promise.all([
    db.post.findMany({ where, select: postCardSelect, orderBy: { publishedAt: "desc" }, take: opts.take ?? 20, skip: opts.skip ?? 0 }),
    db.post.count({ where }),
  ]);
  return { items, total };
}

export async function latestPosts(take = 10) {
  return db.post.findMany({ where: PUBLISHED, select: postCardSelect, orderBy: { publishedAt: "desc" }, take });
}

/** Latest N published posts for each category, keyed by category slug. */
export async function latestByCategory(perCategory = 4) {
  const rows = await Promise.all(
    CATEGORY_SLUGS.map(async (slug) => [slug, await db.post.findMany({ where: { ...PUBLISHED, category: { slug } }, select: postCardSelect, orderBy: { publishedAt: "desc" }, take: perCategory })] as const),
  );
  return Object.fromEntries(rows) as Record<(typeof CATEGORY_SLUGS)[number], PostCard[]>;
}

/** Case-insensitive title/quick-answer search (Postgres ILIKE via mode: "insensitive"). */
export async function searchPublishedPosts(q: string, take = 20) {
  const term = q.trim().slice(0, 100);
  if (term.length < 2) return [];
  return db.post.findMany({
    where: { ...PUBLISHED, OR: [{ title: { contains: term, mode: "insensitive" } }, { quickAnswer: { contains: term, mode: "insensitive" } }] },
    select: postCardSelect,
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export async function getAuthorBySlug(slug: string) {
  return db.author.findUnique({
    where: { slug },
    include: { posts: { where: PUBLISHED, select: postCardSelect, orderBy: { publishedAt: "desc" }, take: 50 } },
  });
}

export async function listAuthorsWithPublished() {
  return db.author.findMany({ where: { posts: { some: PUBLISHED } }, select: { slug: true, name: true, avatar: true, bio: true }, orderBy: { name: "asc" } });
}

/** Everything the sitemap and RSS need. */
export async function allPublishedForIndex() {
  return db.post.findMany({
    where: PUBLISHED,
    select: { slug: true, title: true, quickAnswer: true, featuredImage: true, publishedAt: true, updatedAt: true, category: { select: { slug: true, name: true } }, author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });
}

/** Latest publish/update timestamp per category, for sitemap lastmod. */
export async function categoryLastModified() {
  const rows = await db.post.groupBy({ by: ["categoryId"], where: PUBLISHED, _max: { updatedAt: true } });
  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const out: Record<string, Date | null> = {};
  for (const c of cats) out[c.slug] = rows.find((r) => r.categoryId === c.id)?._max.updatedAt ?? null;
  return out;
}
