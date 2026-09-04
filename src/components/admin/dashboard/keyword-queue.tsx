import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import type { KeywordQueueItem } from "@/lib/admin/dashboard";

export function KeywordQueue({ queuedCount, next }: { queuedCount: number; next: KeywordQueueItem[] }) {
  if (queuedCount === 0) {
    return (
      <EmptyState
        title="No keywords queued"
        description="The pipeline has nothing to write about. Add keywords by hand or wait for the feed ingest."
        action={
          <LinkButton href="/admin/keywords" intent="secondary" size="sm">
            Add keywords
          </LinkButton>
        }
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-600">
        <strong className="font-semibold tabular-nums text-zinc-900">{queuedCount}</strong>{" "}
        {queuedCount === 1 ? "keyword" : "keywords"} queued
        {next.length < queuedCount ? <span className="text-zinc-500"> · showing next {next.length}</span> : null}
      </p>
      <ol className="mt-2 divide-y divide-zinc-100">
        {next.map((k) => (
          <li key={k.id} className="flex items-center justify-between gap-3 py-2 last:pb-0">
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-900">{k.phrase}</span>
            <Badge className="shrink-0">{k.category.name}</Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}
