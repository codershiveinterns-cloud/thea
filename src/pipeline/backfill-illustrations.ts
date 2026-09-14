/**
 * `npm run backfill-illustrations` — generate the Windows 11 Settings illustration set (one
 * featured/OG image, up to two inline images) for every PUBLISHED post that doesn't have one yet.
 * Also repairs posts backfilled by an earlier, file-based version of this script whose images
 * lived under /uploads/illustrations/ — those files only ever existed on whichever machine ran
 * the script and were never reachable from the deployed app (see LEGACY_UPLOAD_MARKER). This
 * version stores nothing on disk: every image is a URL to /api/illustration, rendered on demand.
 *
 *   --dry-run     plan only, write nothing
 *   --limit N     stop after N posts
 *   --id <postId> only that post
 *   --force       regenerate even if the post is already on the current scheme
 */
import "./env";
import { db } from "@/lib/db";
import { generateIllustrationsForPost, ILLUSTRATION_MARKER, LEGACY_UPLOAD_MARKER, planIllustrations, stripIllustrations } from "@/lib/illustrations";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function isLegacy(post: { featuredImage: string | null; body: string }): boolean {
  return (post.featuredImage ?? "").includes(LEGACY_UPLOAD_MARKER) || post.body.includes(LEGACY_UPLOAD_MARKER);
}

function isDone(post: { featuredImage: string | null; body: string }): boolean {
  return post.body.includes(ILLUSTRATION_MARKER) && !isLegacy(post);
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

  const legacyCount = posts.filter(isLegacy).length;
  const todo = posts.filter((p) => force || !isDone(p));
  const targets = todo.slice(0, limit);
  console.log(
    `${posts.length} published post(s); ${legacyCount} on the old broken /uploads scheme, ${todo.length} needing work; processing ${targets.length}${dryRun ? " (dry run)" : ""}.\n`,
  );

  let done = 0,
    failed = 0;
  for (const post of targets) {
    try {
      const cleanBody = stripIllustrations(post.body);
      if (dryRun) {
        const plan = planIllustrations({ title: post.title, body: cleanBody });
        console.log(
          `${post.title}${isLegacy(post) ? " [repair: legacy /uploads path]" : ""}\n  featured: ${plan.featured.screenId} · inline: ${plan.inline.map((p) => p.screenId).join(", ") || "(none — no instructional heading found)"}`,
        );
        continue;
      }
      const { featuredImage, body } = generateIllustrationsForPost({ title: post.title, body: cleanBody });
      await db.post.update({ where: { id: post.id }, data: { featuredImage, body } });
      done++;
      console.log(`${post.title}${isLegacy(post) ? " [repaired]" : ""}\n  done — ${featuredImage}`);
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
