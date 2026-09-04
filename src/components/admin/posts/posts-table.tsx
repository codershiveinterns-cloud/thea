import { QUALITY_GATE_MIN } from "@/lib/constants";
import Link from "next/link";
import type { PostStatus } from "@prisma/client";
import { PostStatusBadge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/dates";
import { postsListHref, type PostListParams, type PostSort } from "./list-params";

/** Quality-gate pass mark from CLAUDE.md: scores below it land in REVIEW instead of publishing. */
const QUALITY_PASS = QUALITY_GATE_MIN;

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  qualityScore: number | null;
  screenshotCount: number;
  updatedAt: Date;
  publishedAt: Date | null;
  category: { name: string; slug: string };
  author: { name: string; slug: string };
};

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const td = "px-3 py-2.5 align-top";

function SortHeader({
  label,
  sort,
  params,
  className = "",
}: {
  label: string;
  sort: PostSort;
  params: PostListParams;
  className?: string;
}) {
  const active = params.sort === sort;
  const ascending = sort === "title";
  return (
    <th scope="col" aria-sort={active ? (ascending ? "ascending" : "descending") : undefined} className={`${th} ${className}`}>
      <Link
        href={postsListHref({ ...params, sort, page: 1 })}
        className={`inline-flex items-center gap-1 hover:text-zinc-900 ${active ? "text-zinc-900" : ""}`}
      >
        {label}
        <span aria-hidden="true" className={active ? "" : "invisible"}>
          {ascending ? "↑" : "↓"}
        </span>
      </Link>
    </th>
  );
}

/** Read-only list. Title links to the editor; category/author cells narrow the current filter. */
export function PostsTable({ posts, params }: { posts: PostRow[]; params: PostListParams }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-xs">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <SortHeader label="Title" sort="title" params={params} className="min-w-[20rem]" />
            <th scope="col" className={th}>
              Category
            </th>
            <th scope="col" className={th}>
              Author
            </th>
            <th scope="col" className={th}>
              Status
            </th>
            <th scope="col" className={th}>
              Quality
            </th>
            <th scope="col" className={th}>
              Screenshots
            </th>
            <SortHeader label="Updated" sort="updated" params={params} />
            <SortHeader label="Published" sort="published" params={params} />
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} className="border-t border-zinc-100 hover:bg-zinc-50">
              <td className={`${td} max-w-md`}>
                <Link href={`/admin/posts/${p.id}`} className="font-medium text-zinc-900 hover:underline">
                  {p.title}
                </Link>
                <div className="mt-0.5 font-mono text-xs text-zinc-500">{p.slug}</div>
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <Link href={postsListHref({ ...params, category: p.category.slug, page: 1 })} className="text-zinc-700 hover:underline">
                  {p.category.name}
                </Link>
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <Link href={postsListHref({ ...params, author: p.author.slug, page: 1 })} className="text-zinc-700 hover:underline">
                  {p.author.name}
                </Link>
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <PostStatusBadge status={p.status} />
              </td>
              <td className={`${td} tabular-nums`}>
                {p.qualityScore == null ? (
                  <span className="text-zinc-400">—</span>
                ) : (
                  <span className={p.qualityScore < QUALITY_PASS ? "font-medium text-red-600" : "text-zinc-800"}>{p.qualityScore}</span>
                )}
              </td>
              <td className={`${td} tabular-nums`}>
                <span className={p.screenshotCount === 0 && p.status === "PUBLISHED" ? "font-medium text-amber-700" : "text-zinc-800"}>
                  {p.screenshotCount}
                </span>
              </td>
              <td className={`${td} whitespace-nowrap text-zinc-600`}>{formatDateTime(p.updatedAt)}</td>
              <td className={`${td} whitespace-nowrap text-zinc-600`}>{formatDate(p.publishedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
