/**
 * `npm run generate` — run the pipeline once from the terminal.
 *   --dry-run        generate + validate, write nothing
 *   --limit N        posts this run (1–3)
 *   --keyword "…"    queue (if needed) and generate this exact phrase in --category <slug>
 *   --skip-ingest    don't fetch feeds first
 *   --ingest-only    fetch feeds and queue keywords, generate nothing
 */
import { db } from "@/lib/db";
import { runPipeline, summarizeReport, isCategorySlug } from "./run";

process.loadEnvFile?.(".env");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(name);

async function main() {
  let keywordId: string | undefined;
  const phrase = arg("--keyword");
  if (phrase) {
    const slug = arg("--category") ?? "how-to";
    if (!isCategorySlug(slug)) throw new Error(`--category must be one of the fixed category slugs, got "${slug}"`);
    const category = await db.category.findUniqueOrThrow({ where: { slug } });
    const existing = await db.keyword.findFirst({ where: { phrase } });
    const kw = existing ?? (await db.keyword.create({ data: { phrase, categoryId: category.id, source: "MANUAL", status: "QUEUED" } }));
    keywordId = kw.id;
  }
  const report = await runPipeline({
    dryRun: has("--dry-run"),
    limit: arg("--limit") ? Number(arg("--limit")) : undefined,
    keywordId,
    skipIngest: has("--skip-ingest"),
    ingestOnly: has("--ingest-only"),
  });
  console.log(`\n${summarizeReport(report)}  tokens in/out: ${report.usage.inputTokens}/${report.usage.outputTokens}`);
  process.exitCode = report.ok ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
