"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { runPipelineNow, type PipelineRunResult } from "@/lib/admin/pipeline";

type Props = {
  postsPerDay: number;
  autoPublish: boolean;
};

/**
 * "Run pipeline now" control for the dashboard header. Shows the two settings that
 * govern a run next to the button, then surfaces the run result inline.
 */
export function RunPipelineButton({ postsPerDay, autoPublish }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PipelineRunResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      // An error thrown inside an async transition surfaces to the nearest error boundary
      // (there is none under /admin) and would replace the whole page. Keep failures inline.
      try {
        const res = await runPipelineNow();
        setResult(res);
        if (res.ok) router.refresh();
      } catch (err) {
        console.error("[dashboard] runPipelineNow failed", err);
        setResult({
          ok: false,
          message: "Could not reach the pipeline. Check the browser console and server log, then try again.",
          createdPostIds: [],
        });
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-zinc-500">
          <span>
            Posts per day: <strong className="font-medium text-zinc-800">{postsPerDay}</strong>
          </span>
          <span aria-hidden="true"> · </span>
          <span>
            Auto-publish:{" "}
            <strong className={`font-medium ${autoPublish ? "text-emerald-700" : "text-zinc-800"}`}>
              {autoPublish ? "on" : "off"}
            </strong>
          </span>
          <span aria-hidden="true"> · </span>
          <Link href="/admin/settings" className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900">
            Change
          </Link>
        </p>
        <Button onClick={run} disabled={pending} aria-busy={pending}>
          {pending ? "Running…" : "Run pipeline now"}
        </Button>
      </div>
      {result ? (
        <div className="w-full sm:max-w-md">
          <Notice kind={result.ok ? "success" : "error"}>{result.message}</Notice>
        </div>
      ) : null}
    </div>
  );
}
