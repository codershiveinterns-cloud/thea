"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/card";
import { refreshPost } from "@/lib/admin/pipeline";
import { formatDate } from "@/lib/dates";

export type ReverifyRow = { id: string; title: string; categoryName: string; verifiedAt: string };

/** Published guides overdue for a hands-on check, with a Refresh action that regenerates them into Review. */
export function ReverifyQueue({ items }: { items: ReverifyRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (items.length === 0) {
    return <EmptyState title="Nothing due" description="Every published guide was verified within the last 90 days." />;
  }

  function refresh(id: string) {
    setBusyId(id);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await refreshPost(id);
        setResult(r);
        if (r.ok) router.refresh();
      } catch {
        setResult({ ok: false, message: "Refresh call failed. Check the server log." });
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {result ? <Notice kind={result.ok ? "success" : "error"}>{result.message}</Notice> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Title</th>
              <th className="py-2 pr-4 font-medium">Category</th>
              <th className="py-2 pr-4 font-medium">Last verified</th>
              <th className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="py-2 pr-4">
                  <Link href={`/admin/posts/${p.id}`} className="font-medium text-zinc-900 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-zinc-600">{p.categoryName}</td>
                <td className="whitespace-nowrap py-2 pr-4 text-zinc-600">{formatDate(p.verifiedAt)}</td>
                <td className="py-2 text-right">
                  <Button size="sm" intent="secondary" disabled={pending} onClick={() => refresh(p.id)} title="Regenerate against fresh sources and move to Review">
                    {busyId === p.id ? "Refreshing…" : "Refresh"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Refresh regenerates the body, quick answer and FAQ from fresh sources and moves the post to Review. Title, slug, meta and screenshots are kept.</p>
    </div>
  );
}
