import Link from "next/link";
import { PostStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { relativeTime } from "@/lib/dates";
import type { RecentActivityItem } from "@/lib/admin/dashboard";

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="No posts yet" description="Create a post or run the pipeline to see activity here." />;
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <Link href={`/admin/posts/${p.id}`} className="block truncate text-sm font-medium text-zinc-900 hover:underline">
              {p.title}
            </Link>
            <p className="text-xs text-zinc-500">
              {p.category.name}
              <span aria-hidden="true"> · </span>
              <time dateTime={p.updatedAt.toISOString()}>{relativeTime(p.updatedAt)}</time>
            </p>
          </div>
          <PostStatusBadge status={p.status} />
        </li>
      ))}
    </ul>
  );
}
