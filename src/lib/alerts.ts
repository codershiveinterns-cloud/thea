/**
 * Pipeline alerts via Resend (https://resend.com). Sends one email when a run fails or
 * creates no posts. Configuration (all env):
 *   RESEND_API_KEY   — Resend API key (free tier is enough)
 *   ALERT_EMAIL      — recipient
 *   ALERT_FROM       — sender; must be a verified Resend domain, or onboarding@resend.dev on the free tier
 * With any of the first two unset the alert is skipped and logged.
 */
import { SITE } from "./constants";
import { logger } from "./log";
import type { PipelineReport } from "@/pipeline/log";

const log = logger("alerts");

export type AlertReason = "failed" | "nothing-published";

/** Pure: which alert (if any) a finished run deserves. Dry runs never alert. */
export function alertReasonFor(report: Pick<PipelineReport, "ok" | "dryRun" | "posts">): AlertReason | null {
  if (report.dryRun) return null;
  if (!report.ok) return "failed";
  const created = report.posts.filter((p) => p.postId).length;
  return created === 0 ? "nothing-published" : null;
}

export function alertSubject(reason: AlertReason, report: Pick<PipelineReport, "finishedAt">): string {
  const day = report.finishedAt.slice(0, 10);
  return reason === "failed" ? `[${SITE.name}] Pipeline run FAILED — ${day}` : `[${SITE.name}] Pipeline run published nothing — ${day}`;
}

export function alertBody(reason: AlertReason, report: PipelineReport, summary: string): string {
  const errors = report.log.filter((e) => e.level === "error").map((e) => `- [${e.step}] ${e.message}`);
  const warns = report.log.filter((e) => e.level === "warn").map((e) => `- [${e.step}] ${e.message}`);
  const posts = report.posts.map((p) => `- ${p.status}: "${p.phrase}"${p.title ? ` → ${p.title}` : ""}${p.qualityScore != null ? ` (score ${p.qualityScore})` : ""}${p.error ? ` — ${p.error}` : ""}`);
  return [
    reason === "failed" ? "A pipeline run finished with errors." : "A pipeline run finished without creating any post.",
    "",
    `Site: ${SITE.url}`,
    `Started: ${report.startedAt}`,
    `Finished: ${report.finishedAt}`,
    `Summary: ${summary}`,
    `Feeds: ${report.ingest.feeds.map((f) => `${f.url} (${f.items} items${f.error ? `, ${f.error}` : ""})`).join("; ") || "none"}`,
    `Tokens in/out: ${report.usage.inputTokens}/${report.usage.outputTokens}`,
    "",
    errors.length ? `Errors:\n${errors.join("\n")}` : "Errors: none",
    warns.length ? `\nWarnings:\n${warns.slice(0, 10).join("\n")}` : "",
    posts.length ? `\nKeywords processed:\n${posts.join("\n")}` : "\nKeywords processed: none (queue empty or nothing eligible)",
    "",
    `Dashboard: ${SITE.url}/admin`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function sendPipelineAlert(report: PipelineReport, summary: string): Promise<{ sent: boolean; reason: AlertReason | null; detail: string }> {
  const reason = alertReasonFor(report);
  if (!reason) return { sent: false, reason: null, detail: "run was healthy" };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.ALERT_EMAIL?.trim();
  if (!apiKey || !to) {
    log.warn("alert skipped — RESEND_API_KEY or ALERT_EMAIL not set", { reason });
    return { sent: false, reason, detail: "RESEND_API_KEY or ALERT_EMAIL not set" };
  }
  const from = process.env.ALERT_FROM?.trim() || `${SITE.name} <onboarding@resend.dev>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: alertSubject(reason, report), text: alertBody(reason, report, summary) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      log.error("Resend rejected the alert", { status: res.status, body: text });
      return { sent: false, reason, detail: `Resend responded ${res.status}` };
    }
    log.info("alert sent", { reason, to });
    return { sent: true, reason, detail: `sent to ${to}` };
  } catch (err) {
    log.error("alert failed", { error: err });
    return { sent: false, reason, detail: (err as Error).message };
  }
}
