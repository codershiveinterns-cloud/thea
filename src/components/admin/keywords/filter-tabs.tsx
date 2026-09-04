import type { KeywordStatus } from "@prisma/client";
import Link from "next/link";
import { KEYWORD_STATUSES } from "@/lib/constants";

export type StatusFilter = KeywordStatus | "all";

/** Builds /admin/keywords?status=…&category=… omitting defaults so the base URL stays clean. */
export function keywordsHref(status: StatusFilter, categorySlug: string | null): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (categorySlug) params.set("category", categorySlug);
  const query = params.toString();
  return query ? `/admin/keywords?${query}` : "/admin/keywords";
}

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All",
  QUEUED: "Queued",
  USED: "Used",
  SKIPPED: "Skipped",
};

type Props = {
  status: StatusFilter;
  categorySlug: string | null;
  /** Counts per status within the selected category. */
  statusCounts: Record<StatusFilter, number>;
  /** Categories with their count within the selected status. */
  categories: { slug: string; name: string; count: number }[];
};

function Pill({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {label}
      <span className={`text-xs tabular-nums ${active ? "text-zinc-300" : "text-zinc-500"}`}>{count}</span>
    </Link>
  );
}

/** Two rows of link pills: status tabs and category chips. Server component — no client JS. */
export function KeywordFilters({ status, categorySlug, statusCounts, categories }: Props) {
  const allCategoriesCount = categories.reduce((sum, c) => sum + c.count, 0);
  return (
    <div className="mb-4 space-y-2">
      <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto">
        {(["all", ...KEYWORD_STATUSES] as StatusFilter[]).map((s) => (
          <Pill key={s} href={keywordsHref(s, categorySlug)} active={status === s} label={STATUS_LABEL[s]} count={statusCounts[s]} />
        ))}
      </nav>
      <nav aria-label="Filter by category" className="flex gap-1 overflow-x-auto border-t border-zinc-100 pt-2">
        <Pill href={keywordsHref(status, null)} active={categorySlug === null} label="All categories" count={allCategoriesCount} />
        {categories.map((c) => (
          <Pill key={c.slug} href={keywordsHref(status, c.slug)} active={categorySlug === c.slug} label={c.name} count={c.count} />
        ))}
      </nav>
    </div>
  );
}
