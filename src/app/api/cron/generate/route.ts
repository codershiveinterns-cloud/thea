/**
 * Vercel Cron target. Always protected: `Authorization: Bearer <CRON_SECRET>`; Vercel sends that header
 * automatically when CRON_SECRET is set on the project. With the secret unset the route refuses every call.
 */
import { NextResponse } from "next/server";
import { runPipeline, summarizeReport } from "@/pipeline/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!process.env.CRON_SECRET?.trim()) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const report = await runPipeline({ dryRun: url.searchParams.get("dryRun") === "1", quiet: true });
  return NextResponse.json({ ok: report.ok, summary: summarizeReport(report), report });
}

export const GET = handle;
export const POST = handle;
