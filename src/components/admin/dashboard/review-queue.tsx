import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { relativeTime } from "@/lib/dates";
import { needsWork, QUALITY_PASS_SCORE, type ReviewQueueItem } from "@/lib/admin/dashboard";

export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing waiting for review"
        description="Posts sent to review from the editor, or created by the pipeline, show up here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Title
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Category
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Author
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Quality
            </th>
            <th scope="col" className="pb-2 font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="py-2 pr-3">
                <Link href={`/admin/posts/${p.id}`} className="font-medium text-zinc-900 hover:underline">
                  {p.title}
                </Link>
              </td>
              <td className="whitespace-nowrap py-2 pr-3 text-zinc-600">{p.category.name}</td>
              <td className="whitespace-nowrap py-2 pr-3 text-zinc-600">{p.author.name}</td>
              <td className="whitespace-nowrap py-2 pr-3">
                <QualityCell score={p.qualityScore} />
              </td>
              <td className="whitespace-nowrap py-2 text-zinc-500">
                <time dateTime={p.updatedAt.toISOString()}>{relativeTime(p.updatedAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityCell({ score }: { score: number | null }) {
  const flagged = needsWork(score);
  const reason = score === null ? "Not scored yet" : `Below the ${QUALITY_PASS_SCORE} quality gate`;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`tabular-nums ${flagged ? "text-zinc-700" : "text-emerald-700"}`}>
        {score === null ? "—" : score}
      </span>
      {flagged ? (
        <span title={reason}>
          <Badge tone="bg-amber-50 text-amber-800 ring-amber-200">needs work</Badge>
        </span>
      ) : null}
    </span>
  );
}
