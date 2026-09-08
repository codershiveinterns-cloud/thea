import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";
import { HomeEmptyState } from "./empty-state";

export const HOME_HEADLINE = "Windows update news and fixes, tested the same day";

/**
 * News-style top: the newest post dominates (two thirds, big image, display headline);
 * the next five posts run down the right as a dense "Latest" list. The h1 is a compact
 * kicker so the story block, not a slogan, owns the fold.
 */
export function HomeHero({ posts }: { posts: PostCardData[] }) {
  const [lead, ...rest] = posts;
  const latest = rest.slice(0, 5);
  const hasList = latest.length > 0;

  return (
    <section aria-labelledby="home-heading" className="pt-8 sm:pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-4">
        <h1 id="home-heading" className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-fg-muted">
          {HOME_HEADLINE}
        </h1>
        <p className="text-xs text-fg-muted">Checked against Microsoft&apos;s release notes; hands-on verification added when available.</p>
      </div>

      {lead ? (
        <div className={`mt-8 grid gap-10 ${hasList ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
          <div>
            <h2 className="font-display sr-only">Top story</h2>
            <PostCard post={lead} variant="lead" priority />
          </div>
          {hasList ? (
            <div className="lg:border-l lg:border-line lg:pl-8">
              <h2 id="latest-heading" className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-fg">
                Latest
              </h2>
              <ul aria-labelledby="latest-heading" className="mt-1 divide-y divide-line">
                {latest.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} variant="compact" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <HomeEmptyState />
      )}
    </section>
  );
}
