import type { KeywordSource } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { KeywordAddForm } from "@/components/admin/keywords/add-form";
import { KeywordFeedback } from "@/components/admin/keywords/action-feedback";
import { KeywordFilters, keywordsHref, type StatusFilter } from "@/components/admin/keywords/filter-tabs";
import { KeywordRowActions } from "@/components/admin/keywords/row-actions";
import { Badge, KeywordStatusBadge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { CATEGORY_SLUGS, KEYWORD_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { categorySlugSchema, keywordStatusSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Keywords" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const SOURCE_LABEL: Record<KeywordSource, string> = { FEED: "Feed", MANUAL: "Manual" };
const SOURCE_TONE: Record<KeywordSource, string> = {
  FEED: "bg-violet-50 text-violet-800 ring-violet-200",
  MANUAL: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

export default async function KeywordsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  // Anything unrecognised falls back to the default rather than erroring.
  const statusParsed = keywordStatusSchema.safeParse(first(sp.status).toUpperCase());
  const status: StatusFilter = statusParsed.success ? statusParsed.data : "all";
  const categoryParsed = categorySlugSchema.safeParse(first(sp.category));
  const categorySlug = categoryParsed.success ? categoryParsed.data : null;

  const statusWhere = status === "all" ? {} : { status };
  const categoryWhere = categorySlug ? { category: { slug: categorySlug } } : {};

  const [categories, keywords, byStatus, byCategory] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.keyword.findMany({
      where: { ...statusWhere, ...categoryWhere },
      include: { category: { select: { name: true, slug: true } } },
      // Newest first — the same order the pipeline consumes the queue in. Bulk pastes and
      // the seed create rows in the same millisecond, so tie-break on id (cuids are
      // monotonic within a process) to keep the order stable across refreshes.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    db.keyword.groupBy({ by: ["status"], where: categoryWhere, _count: { _all: true } }),
    db.keyword.groupBy({ by: ["categoryId"], where: statusWhere, _count: { _all: true } }),
  ]);

  // Keep the fixed category order from constants regardless of DB insertion order.
  const order = new Map<string, number>(CATEGORY_SLUGS.map((slug, i) => [slug, i]));
  const orderedCategories = [...categories].sort(
    (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
  );

  const statusCounts: Record<StatusFilter, number> = { all: 0, QUEUED: 0, USED: 0, SKIPPED: 0 };
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all;
    statusCounts.all += row._count._all;
  }
  const categoryCount = new Map(byCategory.map((row) => [row.categoryId, row._count._all]));
  const categoryFilters = orderedCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: categoryCount.get(c.id) ?? 0,
  }));

  const filtered = status !== "all" || categorySlug !== null;

  return (
    <>
      <PageHeader
        title="Keywords"
        description="The pipeline picks QUEUED keywords newest-first on each run, so whatever you add last is written up first."
      />

      <div className="space-y-6">
        <Card title="Add to the queue">
          <KeywordAddForm categories={orderedCategories} />
        </Card>

        <Card
          title="Queue"
          actions={
            <span className="text-xs text-zinc-500">
              {keywords.length} of {statusCounts.all} shown
            </span>
          }
        >
          <KeywordFilters status={status} categorySlug={categorySlug} statusCounts={statusCounts} categories={categoryFilters} />

          <KeywordFeedback>
            {keywords.length === 0 ? (
              <EmptyState
                title={filtered ? "No keywords match these filters" : "The queue is empty"}
                description={
                  filtered ? (
                    <>
                      Try{" "}
                      <Link href={keywordsHref("all", null)} className="text-blue-700 underline">
                        clearing the filters
                      </Link>
                      .
                    </>
                  ) : (
                    "Add phrases above, or wait for the feed ingester to fill it."
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-medium">Phrase</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Category</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Source</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Created</th>
                      <th scope="col" className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {keywords.map((k) => (
                      <tr key={k.id} className="align-middle">
                        <td className="py-2.5 pr-4 font-medium text-zinc-900">{k.phrase}</td>
                        <td className="py-2.5 pr-4 text-zinc-700">
                          <Link href={keywordsHref(status, k.category.slug)} className="hover:underline">
                            {k.category.name}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={SOURCE_TONE[k.source]}>{SOURCE_LABEL[k.source]}</Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <KeywordStatusBadge status={k.status} />
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-zinc-600">
                          <time dateTime={k.createdAt.toISOString()}>{formatDateTime(k.createdAt)}</time>
                        </td>
                        <td className="py-2.5">
                          <KeywordRowActions id={k.id} phrase={k.phrase} status={k.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </KeywordFeedback>

          <p className="mt-3 text-xs text-zinc-500">
            Statuses: {KEYWORD_STATUSES.map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(" · ")}. Used keywords
            stay listed so the same phrase is not queued twice; re-queue one to have it written up again.
          </p>
        </Card>
      </div>
    </>
  );
}
