import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { PostFilters } from "@/components/admin/posts/filters";
import {
  DEFAULT_SORT,
  POSTS_PAGE_SIZE,
  hasActiveFilters,
  parsePostListFlash,
  parsePostListParams,
  postsListHref,
  withKnownFilters,
  type PostListParams,
  type PostSort,
  type RawSearchParams,
} from "@/components/admin/posts/list-params";
import { PostsPagination } from "@/components/admin/posts/pagination";
import { PostsTable, type PostRow } from "@/components/admin/posts/posts-table";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/card";
import { POST_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/post-status";
import { readStringArray } from "@/lib/validation";

export const metadata: Metadata = { title: "Posts" };

function buildWhere(p: PostListParams): Prisma.PostWhereInput {
  return {
    ...(p.status ? { status: p.status } : {}),
    ...(p.category ? { category: { slug: p.category } } : {}),
    ...(p.author ? { author: { slug: p.author } } : {}),
    // SQLite `contains` is already case-insensitive for ASCII; `mode: "insensitive"` is Postgres-only.
    // LIKE wildcards (% and _) are stripped from `q` by the params schema, so the match is literal.
    ...(p.q ? { title: { contains: p.q } } : {}),
  };
}

function orderByFor(sort: PostSort): Prisma.PostOrderByWithRelationInput[] {
  switch (sort) {
    case "title":
      return [{ title: "asc" }];
    case "published":
      // Explicit nulls-last so unpublished posts sink on Postgres too (DESC puts NULLs first there).
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  // The option lists are needed before the query so a stale category/author slug can be dropped
  // rather than filtering on a value the select cannot display.
  const [raw, categories, authors] = await Promise.all([
    searchParams,
    db.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.author.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  const flash = parsePostListFlash(raw);
  const requested = withKnownFilters(parsePostListParams(raw), {
    categories: categories.map((c) => c.slug),
    authors: authors.map((a) => a.slug),
  });
  const where = buildWhere(requested);

  const total = await db.post.count({ where });

  // A page past the end (stale link, shrunk result set) shows the last page instead of nothing.
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE));
  const page = Math.min(requested.page, totalPages);
  const params: PostListParams = { ...requested, page };

  const rows =
    total === 0
      ? []
      : await db.post.findMany({
          where,
          orderBy: orderByFor(params.sort),
          skip: (page - 1) * POSTS_PAGE_SIZE,
          take: POSTS_PAGE_SIZE,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            qualityScore: true,
            screenshots: true,
            updatedAt: true,
            publishedAt: true,
            category: { select: { name: true, slug: true } },
            author: { select: { name: true, slug: true } },
          },
        });

  const posts: PostRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    qualityScore: r.qualityScore,
    screenshotCount: readStringArray(r.screenshots).length,
    updatedAt: r.updatedAt,
    publishedAt: r.publishedAt,
    category: r.category,
    author: r.author,
  }));

  const filtering = hasActiveFilters(params);
  const filterValues = {
    status: params.status,
    category: params.category,
    author: params.author,
    q: params.q,
    sort: params.sort === DEFAULT_SORT ? undefined : params.sort,
  };

  return (
    <>
      <PageHeader
        title="Posts"
        description="Everything in the editorial pipeline, from draft to published."
        actions={<LinkButton href="/admin/posts/new">New post</LinkButton>}
      />

      {flash.deleted ? (
        <div className="mb-4">
          <Notice kind="success">Post deleted.</Notice>
        </div>
      ) : null}

      <div className="mb-4">
        {/* Keyed on the URL state so the uncontrolled inputs reset when a link (Clear, a table cell) changes the filters. */}
        <PostFilters
          key={postsListHref({ ...params, page: 1 })}
          statuses={POST_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
          authors={authors.map((a) => ({ value: a.slug, label: a.name }))}
          values={filterValues}
        />
      </div>

      <p className="mb-3 text-sm text-zinc-600">
        <span className="font-medium text-zinc-900 tabular-nums">{total}</span> {total === 1 ? "post" : "posts"}
        {filtering ? " matching these filters" : ""}
      </p>

      {total === 0 ? (
        filtering ? (
          <EmptyState
            title="No posts match these filters"
            description="Try a different status, category, author or search term."
            action={
              <div className="flex gap-2">
                <LinkButton href="/admin/posts" intent="secondary">
                  Clear filters
                </LinkButton>
                <LinkButton href="/admin/posts/new">New post</LinkButton>
              </div>
            }
          />
        ) : (
          <EmptyState
            title="No posts yet"
            description="Write one by hand or run the pipeline from the dashboard."
            action={<LinkButton href="/admin/posts/new">New post</LinkButton>}
          />
        )
      ) : (
        <>
          <PostsTable posts={posts} params={params} />
          <PostsPagination params={params} page={page} totalPages={totalPages} total={total} />
        </>
      )}
    </>
  );
}
