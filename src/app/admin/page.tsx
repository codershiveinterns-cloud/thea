import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { Card, Notice, PageHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { KeywordQueue } from "@/components/admin/dashboard/keyword-queue";
import { RecentActivity } from "@/components/admin/dashboard/recent-activity";
import { ReviewQueue } from "@/components/admin/dashboard/review-queue";
import { RunPipelineButton } from "@/components/admin/dashboard/run-pipeline-button";
import { StatCards } from "@/components/admin/dashboard/stat-cards";
import { VerifyQueue } from "@/components/admin/dashboard/verify-queue";
import { getDashboardData } from "@/lib/admin/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

// Counts and queues must always be fresh — never prerender the admin dashboard.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const reviewTotal = data.statusCounts.REVIEW;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="What needs a human today: review new posts, verify what went live, and keep the keyword queue full."
        actions={<RunPipelineButton postsPerDay={data.settings.postsPerDay} autoPublish={data.settings.autoPublish} />}
      />

      <StatCards counts={data.statusCounts} />

      {data.runHistory.length > 0 ? (
        <details className="mt-6 rounded-lg border border-zinc-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900">Recent pipeline runs ({data.runHistory.length})</summary>
          <div className="overflow-x-auto border-t border-zinc-100">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Finished</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                  <th className="px-4 py-2 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.runHistory.map((r) => (
                  <tr key={r.finishedAt} className="align-top">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(r.finishedAt)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${r.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-800 ring-red-200"}`}>{r.ok ? "OK" : "Failed"}</span>
                    </td>
                    <td className="px-4 py-2 text-zinc-700">
                      {r.summary}
                      {r.errors.length ? (
                        <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                          {r.errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {data.lastRun ? (
        <div className="mt-6">
          <Notice kind={data.lastRun.ok ? "success" : "warning"}>
            <span className="font-medium">Last pipeline run</span> · {formatDateTime(data.lastRun.finishedAt)}
            {data.lastRun.dryRun ? " (dry run)" : ""}: {data.lastRun.summary}
            {data.lastRun.errors.length ? (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {data.lastRun.errors.slice(0, 5).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={
            <>
              Review queue{" "}
              <span className="font-normal tabular-nums text-zinc-400">({reviewTotal})</span>
            </>
          }
          actions={
            <LinkButton href="/admin/posts?status=REVIEW" intent="ghost" size="sm">
              View all
            </LinkButton>
          }
        >
          <ReviewQueue items={data.reviewQueue} />
          {reviewTotal > data.reviewQueue.length ? (
            <p className="mt-3 text-xs text-zinc-500">
              Showing the {data.reviewQueue.length} most recently updated of {reviewTotal} in review.
            </p>
          ) : null}
        </Card>

        <Card
          title="Published — verify"
          actions={
            <LinkButton href="/admin/posts?status=PUBLISHED" intent="ghost" size="sm">
              Published
            </LinkButton>
          }
        >
          <VerifyQueue items={data.verifyQueue} />
          {data.verifyQueue.length > 0 ? (
            <p className="mt-3 text-xs text-zinc-500">
              Live posts with no “Tested on” build yet. They show “Verified: pending” on the site until you add one.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card
          title="Keyword queue"
          actions={
            <LinkButton href="/admin/keywords" intent="ghost" size="sm">
              Manage keywords
            </LinkButton>
          }
        >
          <KeywordQueue queuedCount={data.keywordQueue.queuedCount} next={data.keywordQueue.next} />
        </Card>

        <Card
          className="xl:col-span-2"
          title="Recent activity"
          actions={
            <LinkButton href="/admin/posts" intent="ghost" size="sm">
              All posts
            </LinkButton>
          }
        >
          <RecentActivity items={data.recentActivity} />
        </Card>
      </div>
    </>
  );
}
