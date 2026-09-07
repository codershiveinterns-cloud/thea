/**
 * Vercel Cron target (go-live). Protected by CRON_SECRET: `Authorization: Bearer <CRON_SECRET>`.
 * Locally, with CRON_SECRET unset and NODE_ENV !== production, the route is open for testing.
 */
import { NextResponse } from "next/server";
import { runPipeline, summarizeReport } from "@/pipeline/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const report = await runPipeline({ dryRun: url.searchParams.get("dryRun") === "1", quiet: true });
  return NextResponse.json({ ok: report.ok, summary: summarizeReport(report), report });
}

export const GET = handle;
export const POST = handle;
