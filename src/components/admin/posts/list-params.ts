/**
 * URL state for /admin/posts.
 *
 * `parsePostListParams` validates `searchParams` field by field — every field has its
 * own fallback, so one bad value (a made-up status, page=abc) never discards the rest.
 * `withKnownFilters` then drops category/author slugs that no longer exist, so the query
 * and the filter bar always agree. `postsListHref` serialises the same shape back into a
 * link, omitting defaults, so the filter bar, sortable column headers and pagination all
 * agree on the query string.
 */
import { z } from "zod";
import { POST_STATUSES } from "@/lib/constants";
import { categorySlugSchema, slugSchema } from "@/lib/validation";

export const POSTS_PAGE_SIZE = 25;

export const POST_SORTS = ["updated", "published", "title"] as const;
export type PostSort = (typeof POST_SORTS)[number];
export const DEFAULT_SORT: PostSort = "updated";

/**
 * Prisma's SQLite `contains` compiles to `LIKE '%…%'` with no ESCAPE clause, so `%` and `_`
 * would act as wildcards (q=_ matches every post). They are replaced with spaces before the
 * value reaches the query; the sanitised term is what gets echoed back into the input and links.
 */
const LIKE_WILDCARDS_RE = /[%_]/g;

const paramsSchema = z.object({
  status: z.enum(POST_STATUSES).optional().catch(undefined),
  category: categorySlugSchema.optional().catch(undefined),
  author: slugSchema.optional().catch(undefined),
  q: z
    .string()
    .max(120)
    .transform((s) => s.replace(LIKE_WILDCARDS_RE, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1))
    .optional()
    .catch(undefined),
  sort: z.enum(POST_SORTS).catch(DEFAULT_SORT),
  page: z.coerce.number().int().min(1).catch(1),
});

export type PostListParams = z.infer<typeof paramsSchema>;

/** One-shot notices set by editor redirects (`deletePost` sends the user to `/admin/posts?deleted=1`). */
const flashSchema = z.object({
  deleted: z.literal("1").optional().catch(undefined),
});

export type PostListFlash = { deleted: boolean };

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Never throws: invalid or missing values fall back to their defaults. */
export function parsePostListParams(raw: RawSearchParams): PostListParams {
  return paramsSchema.parse({
    status: first(raw.status),
    category: first(raw.category),
    author: first(raw.author),
    q: first(raw.q),
    sort: first(raw.sort),
    page: first(raw.page),
  });
}

/** Never throws: anything but the exact flag value reads as "no notice". */
export function parsePostListFlash(raw: RawSearchParams): PostListFlash {
  const flags = flashSchema.parse({ deleted: first(raw.deleted) });
  return { deleted: flags.deleted === "1" };
}

/**
 * Ignores category/author filters that don't match an existing record (renamed or deleted
 * author, stale link). Without this the query would filter on the unknown slug while the
 * select — having no matching option — displayed "All …", and the next auto-submit would
 * silently drop the filter anyway.
 */
export function withKnownFilters(
  params: PostListParams,
  known: { categories: readonly string[]; authors: readonly string[] },
): PostListParams {
  return {
    ...params,
    category: params.category && known.categories.includes(params.category) ? params.category : undefined,
    author: params.author && known.authors.includes(params.author) ? params.author : undefined,
  };
}

/** Builds `/admin/posts?…`, dropping blanks and defaults so URLs stay short and shareable. Flash flags are never carried forward. */
export function postsListHref(params: Partial<PostListParams>): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.category) sp.set("category", params.category);
  if (params.author) sp.set("author", params.author);
  if (params.q) sp.set("q", params.q);
  if (params.sort && params.sort !== DEFAULT_SORT) sp.set("sort", params.sort);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/posts?${qs}` : "/admin/posts";
}

export function hasActiveFilters(params: PostListParams): boolean {
  return Boolean(params.status || params.category || params.author || params.q);
}
