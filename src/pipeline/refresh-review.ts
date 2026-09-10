/**
 * `npm run refresh-review` — regenerate every post currently in REVIEW with the current pipeline
 * (evergreen research + provider fallback), then publish the ones that pass the identifier check
 * and reach Setting MIN_QUALITY_SCORE. Others stay in REVIEW. Prints a before/after table.
 *   --dry-run   regenerate and score, but write nothing
 *   --id <postId>   only that post
 */
import "./env";
import { db } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/constants";
import { pingIndexNow } from "@/lib/indexing";
import { getSetting, settingInt } from "@/lib/settings";
import { decidePublish } from "./quality";
import { refreshPostFromSources } from "./reverify";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type Row = { id: string; title: string; category: string; before: number | null; after: number | null; provider: string; flagged: string[]; result: string };

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const only = arg("--id");
  const minScore = Math.max(0, Math.min(100, settingInt(await getSetting(SETTING_KEYS.MIN_QUALITY_SCORE), 0)));
  const posts = await db.post.findMany({
    where: { status: "REVIEW", ...(only ? { id: only } : {}) },
    select: { id: true, title: true, slug: true, qualityScore: true, category: { select: { slug: true } } },
    orderBy: { updatedAt: "asc" },
  });
  console.log(`${posts.length} post(s) in REVIEW · publish threshold ${minScore}${dryRun ? " · DRY RUN" : ""}\n`);
  const rows: Row[] = [];
  for (const p of posts) {
    const row: Row = { id: p.id, title: p.title, category: p.category.slug, before: p.qualityScore, after: null, provider: "", flagged: [], result: "" };
    try {
      const r = await refreshPostFromSources(p.id, { dryRun });
      row.after = r.score;
      row.flagged = r.flaggedIdentifiers;
      row.provider = r.provider;
      const decision = decidePublish({ autoPublish: true, score: r.score, flaggedIdentifiers: r.flaggedIdentifiers, minScore });
      if (dryRun) {
        row.result = `would be ${decision}`;
      } else if (decision === "PUBLISHED") {
        const updated = await db.post.update({ where: { id: p.id }, data: { status: "PUBLISHED", publishedAt: new Date() }, select: { slug: true, category: { select: { slug: true } } } });
        const ping = await pingIndexNow([`/${updated.category.slug}/${updated.slug}`]);
        row.result = `PUBLISHED (${ping.attempted ? ping.detail : "IndexNow skipped"})`;
      } else {
        row.result = r.flaggedIdentifiers.length ? `REVIEW — unsupported identifiers: ${r.flaggedIdentifiers.join(", ")}` : `REVIEW — score ${r.score} < ${minScore}`;
      }
    } catch (err) {
      row.result = `FAILED — ${(err as Error).message.slice(0, 160)}`;
    }
    rows.push(row);
    console.log(`${row.title}\n  ${row.category} · before ${row.before ?? "—"} → after ${row.after ?? "—"} · ${row.provider || "n/a"} · ${row.result}`);
  }
  const published = rows.filter((r) => r.result.startsWith("PUBLISHED")).length;
  console.log(`\nDone: ${published} published, ${rows.filter((r) => r.result.startsWith("REVIEW")).length} left in review, ${rows.filter((r) => r.result.startsWith("FAILED")).length} failed.`);
  if (!dryRun && published > 0) console.log("Public pages refresh within the hour (ISR) — or sooner via the admin's next publish, which revalidates everything.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
