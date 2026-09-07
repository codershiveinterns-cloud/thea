/**
 * Read-only queries behind the /admin dashboard. Deliberately NOT a "use server"
 * file: nothing here mutates, and it is only ever called from the dashboard
 * server component. Mutations live in the sibling src/lib/admin/* action files.
 */
import { QUALITY_GATE_MIN } from "@/lib/constants";
import { summarizeReport } from "@/pipeline/run";
import type { PipelineReport } from "@/pipeline/log";
import type { PostStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { POST_STATUSES } from "@/lib/constants";
import { getAllSettings, settingBool, settingInt } from "@/lib/settings";

/** Re-exported for dashboard components; single source of truth is src/lib/constants.ts. */
export const QUALITY_PASS_SCORE = QUALITY_GATE_MIN;

export const REVIEW_QUEUE_LIMIT = 10;
export const KEYWORD_QUEUE_PREVIEW = 5;
export const RECENT_ACTIVITY_LIMIT = 8;

export type StatusCounts = Record<PostStatus, number>;

export type ReviewQueueItem = {
  id: string;
  title: string;
  qualityScore: number | null;
  updatedAt: Date;
  category: { name: string; slug: string };
  author: { name: string };
};

export type VerifyQueueItem = {
  id: string;
  title: string;
  publishedAt: Date | null;
};

export type KeywordQueueItem = {
  id: string;
  phrase: string;
  category: { name: string; slug: string };
};

export type RecentActivityItem = {
  id: string;
  title: string;
  status: PostStatus;
  updatedAt: Date;
  category: { name: string };
};

export type DashboardSettings = {
  postsPerDay: number;
  autoPublish: boolean;
};

export type LastRun = { finishedAt: string; ok: boolean; dryRun: boolean; summary: string; errors: string[] } | null;

export type DashboardData = {
  lastRun: LastRun;
  statusCounts: StatusCounts;
  reviewQueue: ReviewQueueItem[];
  verifyQueue: VerifyQueueItem[];
  keywordQueue: { queuedCount: number; next: KeywordQueueItem[] };
  recentActivity: RecentActivityItem[];
  settings: DashboardSettings;
};

/** A post in review "needs work" when it was never scored or scored under the gate. */
export function needsWork(score: number | null): boolean {
  return score === null || score < QUALITY_PASS_SCORE;
}

async function getStatusCounts(): Promise<StatusCounts> {
  const rows = await db.post.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = Object.fromEntries(POST_STATUSES.map((s) => [s, 0])) as StatusCounts;
  for (const r of rows) counts[r.status] = r._count._all;
  return counts;
}

function getReviewQueue(): Promise<ReviewQueueItem[]> {
  return db.post.findMany({
    where: { status: "REVIEW" },
    orderBy: { updatedAt: "desc" },
    take: REVIEW_QUEUE_LIMIT,
    select: {
      id: true,
      title: true,
      qualityScore: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
      author: { select: { name: true } },
    },
  });
}

/**
 * Still PUBLISHED, went live since local midnight, and missing a "Tested on" build.
 * The status filter matters: leaving PUBLISHED (archive / back to draft) keeps
 * publishedAt as history, so publishedAt alone would list posts that are no longer live.
 */
function getVerifyQueue(): Promise<VerifyQueueItem[]> {
  return db.post.findMany({
    where: { status: "PUBLISHED", testedOnBuild: null },
    take: 10,
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, publishedAt: true },
  });
}

function getQueuedKeywordCount(): Promise<number> {
  return db.keyword.count({ where: { status: "QUEUED" } });
}

/** Newest first — the same order the pipeline selects from (CLAUDE.md: "newest release first"). */
function getNextKeywords(): Promise<KeywordQueueItem[]> {
  return db.keyword.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "desc" },
    take: KEYWORD_QUEUE_PREVIEW,
    select: { id: true, phrase: true, category: { select: { name: true, slug: true } } },
  });
}

function getRecentActivity(): Promise<RecentActivityItem[]> {
  return db.post.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_LIMIT,
    select: { id: true, title: true, status: true, updatedAt: true, category: { select: { name: true } } },
  });
}

async function getDashboardSettings(): Promise<DashboardSettings> {
  const s = await getAllSettings();
  return {
    postsPerDay: settingInt(s.POSTS_PER_DAY, 2),
    autoPublish: settingBool(s.AUTO_PUBLISH),
  };
}

async function getLastRun(): Promise<LastRun> {
  const raw = (await getAllSettings()).PIPELINE_LAST_RUN;
  if (!raw) return null;
  try {
    const report = JSON.parse(raw) as PipelineReport;
    return {
      finishedAt: report.finishedAt,
      ok: report.ok,
      dryRun: report.dryRun,
      summary: summarizeReport(report),
      errors: report.log.filter((e) => e.level === "error").map((e) => `[${e.step}] ${e.message}`),
    };
  } catch {
    return null;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [statusCounts, reviewQueue, verifyQueue, queuedCount, next, recentActivity, settings, lastRun] = await Promise.all([
    getStatusCounts(),
    getReviewQueue(),
    getVerifyQueue(),
    getQueuedKeywordCount(),
    getNextKeywords(),
    getRecentActivity(),
    getDashboardSettings(),
    getLastRun(),
  ]);

  return {
    statusCounts,
    reviewQueue,
    verifyQueue,
    keywordQueue: { queuedCount, next },
    recentActivity,
    settings,
    lastRun,
  };
}
