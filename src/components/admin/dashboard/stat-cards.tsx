import Link from "next/link";
import type { PostStatus } from "@prisma/client";
import { POST_STATUSES } from "@/lib/constants";
import { STATUS_LABEL } from "@/lib/post-status";
import type { StatusCounts } from "@/lib/admin/dashboard";

/** Dot colours mirror the tones used by PostStatusBadge. */
const dot: Record<PostStatus, string> = {
  DRAFT: "bg-zinc-400",
  REVIEW: "bg-amber-500",
  APPROVED: "bg-sky-500",
  PUBLISHED: "bg-emerald-500",
  ARCHIVED: "bg-zinc-300",
};

export function StatCards({ counts }: { counts: StatusCounts }) {
  return (
    <ul aria-label="Posts by status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {POST_STATUSES.map((status) => (
        <li key={status}>
          <Link
            href={`/admin/posts?status=${status}`}
            className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-xs transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot[status]}`} aria-hidden="true" />
              {STATUS_LABEL[status]}
            </span>
            <span className="mt-2 block text-2xl font-semibold tabular-nums text-zinc-900">{counts[status]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
