import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
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
