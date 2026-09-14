/**
 * `npm run backfill-illustrations` — generate the Windows 11 Settings illustration set (one
 * featured/OG image, up to two inline images) for every PUBLISHED post that doesn't have one
 * yet, newest first. Idempotent: a post whose body already contains the "Illustration:" marker
 * is skipped, so reruns only touch posts backfilled since the last run.
 *   --dry-run     plan only, write nothing
 *   --limit N     stop after N posts
 *   --id <postId> only that post
 *   --force       regenerate even if the post already has illustrations
 */
import "./env";
import { db } from "@/lib/db";
import { generateIllustrationsForPost, ILLUSTRATION_MARKER, planIllustrations } from "@/lib/illustrations";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const only = arg("--id");
  const limit = Math.max(1, Number(arg("--limit") ?? Number.POSITIVE_INFINITY) || Number.POSITIVE_INFINITY);

  const posts = await db.post.findMany({
    where: { status: "PUBLISHED", ...(only ? { id: only } : {}) },
    select: { id: true, title: true, slug: true, body: true, featuredImage: true },
    orderBy: { publishedAt: "desc" },
  });

  const todo = force ? posts : posts.filter((p) => !p.body.includes(ILLUSTRATION_MARKER));
  const targets = todo.slice(0, limit);
  console.log(`${posts.length} published post(s); ${todo.length} without illustrations; processing ${targets.length}${dryRun ? " (dry run)" : ""}.\n`);

  let done = 0, failed = 0;
  for (const post of targets) {
    try {
      if (dryRun) {
        const plan = planIllustrations({ title: post.title, body: post.body });
        console.log(`${post.title}\n  featured: ${plan.featured.screenId} · inline: ${plan.inline.map((p) => p.screenId).join(", ") || "(none — no instructional heading found)"}`);
        continue;
      }
      const { featuredImage, body } = await generateIllustrationsForPost({ title: post.title, body: post.body, slug: post.slug });
      await db.post.update({ where: { id: post.id }, data: { featuredImage, body } });
      done++;
      console.log(`${post.title}\n  done — ${featuredImage}`);
    } catch (err) {
      failed++;
      console.log(`${post.title}\n  FAILED — ${(err as Error).message.slice(0, 200)}`);
    }
  }

  console.log(`\nDone: ${dryRun ? `${targets.length} planned` : `${done} updated`}, ${failed} failed, ${todo.length - targets.length} left for a future run.`);
  if (!dryRun && done > 0) console.log("Public pages refresh within the hour (ISR) — or sooner via the admin's next publish, which revalidates everything.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
