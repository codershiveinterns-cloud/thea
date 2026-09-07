/**
 * `npm run scheduler` — local stand-in for Vercel Cron. Fires at 09:00 local time daily,
 * generates the first post immediately and spaces the rest a few hours apart so publish
 * times look natural. Respects Setting SCHEDULER_ENABLED and POSTS_PER_DAY.
 */
import cron from "node-cron";
import { POSTS_PER_DAY_MAX } from "@/lib/constants";
import { getAllSettings, settingBool, settingInt } from "@/lib/settings";
import { runPipeline, summarizeReport } from "./run";

process.loadEnvFile?.(".env");

const CRON = process.env.SCHEDULER_CRON ?? "0 9 * * *";
const HOUR = 60 * 60 * 1000;

/** Delays (ms) after the 09:00 run for posts 2..n: 2–3 h apart, jittered. Exported for tests. */
export function spreadDelays(count: number, random: () => number = Math.random): number[] {
  const out: number[] = [];
  let t = 0;
  for (let i = 1; i < count; i++) {
    t += 2 * HOUR + Math.floor(random() * HOUR);
    out.push(t);
  }
  return out;
}

async function daily() {
  const settings = await getAllSettings();
  if (!settingBool(settings.SCHEDULER_ENABLED)) {
    console.log(`[scheduler] ${new Date().toISOString()} skipped — SCHEDULER_ENABLED is off`);
    return;
  }
  const perDay = Math.min(POSTS_PER_DAY_MAX, Math.max(1, settingInt(settings.POSTS_PER_DAY, 2)));
  console.log(`[scheduler] ${new Date().toISOString()} daily run: ${perDay} post(s)`);
  const first = await runPipeline({ limit: 1 });
  console.log(`[scheduler] ${summarizeReport(first)}`);
  for (const delay of spreadDelays(perDay)) {
    setTimeout(async () => {
      const r = await runPipeline({ limit: 1, skipIngest: true });
      console.log(`[scheduler] ${new Date().toISOString()} ${summarizeReport(r)}`);
    }, delay);
    console.log(`[scheduler] next post at ${new Date(Date.now() + delay).toLocaleTimeString()}`);
  }
}

if (process.argv.includes("--now")) {
  daily().catch((err) => console.error(err));
} else {
  if (!cron.validate(CRON)) throw new Error(`Invalid SCHEDULER_CRON "${CRON}"`);
  cron.schedule(CRON, () => daily().catch((err) => console.error("[scheduler] run failed", err)));
  console.log(`[scheduler] armed: "${CRON}" (local time). Ctrl+C to stop. Use --now to run today's batch immediately.`);
}
