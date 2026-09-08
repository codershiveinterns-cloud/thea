/**
 * `npm run backfill -- --months 6` — one-time keyword backfill from the Windows 11 update history hub.
 * Every KB from the last N months becomes queued keywords (release + update-problems), deduped by phrase.
 * Nothing is generated; run `npm run generate` afterwards. `--dry-run` lists without saving.
 */
import "./env";
import { db } from "@/lib/db";
import { RunLog } from "./log";
import { ingest } from "./run";
import { DEFAULT_FEED_URLS } from "./sources/feeds";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const months = Math.max(1, Math.min(24, Number(arg("--months") ?? 6) || 6));
  const dryRun = process.argv.includes("--dry-run");
  const urls = DEFAULT_FEED_URLS.filter((u) => u.includes("support.microsoft.com"));
  const log = new RunLog(true);
  log.info("backfill", `update history, last ${months} month(s)${dryRun ? " (dry run)" : ""}`);
  const r = await ingest(urls, log, dryRun, { maxAgeDays: Math.round(months * 30.44), maxNew: Number.POSITIVE_INFINITY });
  console.log(`\n${r.newKeywords} keyword(s) ${dryRun ? "would be" : ""} queued from ${r.items.length} update-history entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
