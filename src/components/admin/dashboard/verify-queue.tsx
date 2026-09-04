import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import type { VerifyQueueItem } from "@/lib/admin/dashboard";

export function VerifyQueue({ items }: { items: VerifyQueueItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing to verify"
        description="Posts that went live since midnight (local time) and still have no “Tested on” build show up here. Older unverified posts stay in the Published list."
      />
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <Link href={`/admin/posts/${p.id}`} className="block truncate text-sm font-medium text-zinc-900 hover:underline">
              {p.title}
            </Link>
            <p className="text-xs text-zinc-500">
              Published{" "}
              {p.publishedAt ? (
                <time dateTime={p.publishedAt.toISOString()}>{formatDateTime(p.publishedAt)}</time>
              ) : (
                "—"
              )}
              <span aria-hidden="true"> · </span>
              <span className="text-amber-700">Verified: pending</span>
            </p>
          </div>
          <LinkButton href={`/admin/posts/${p.id}`} intent="secondary" size="sm">
            Open editor
          </LinkButton>
        </li>
      ))}
    </ul>
  );
}
