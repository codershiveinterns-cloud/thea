import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";
import { HomeEmptyState } from "./empty-state";

export const HOME_HEADLINE = "Windows update news and fixes, tested the same day";

/**
 * Hero row: the visible h1, the newest post as the feature card (LCP image, priority),
 * and the next four posts as a compact "Latest" list. Falls back to an honest empty state.
 */
export function HomeHero({ posts }: { posts: PostCardData[] }) {
  const [feature, ...rest] = posts;
  const latest = rest.slice(0, 4);
  const hasList = latest.length > 0;

  return (
    <section aria-labelledby="home-heading" className="py-10">
      <div className="max-w-3xl">
        <h1 id="home-heading" className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
          {HOME_HEADLINE}
        </h1>
        <p className="mt-3 text-lg leading-7 text-zinc-600">
          What changed in each Windows 11 update, what it broke, and step-by-step fixes for the error codes and app problems that
          follow — reviewed by human editors and checked against Microsoft&apos;s release notes.
        </p>
      </div>

      {feature ? (
        <div className={`mt-8 grid gap-8 ${hasList ? "lg:grid-cols-3" : ""}`}>
          {/* PostCard titles are <h3>, so each column carries an <h2> in DOM order — no h1 → h3 skip, even with a single post. */}
          <div className={hasList ? "lg:col-span-2" : ""}>
            <h2 id="featured-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Featured
            </h2>
            <div className="mt-2">
              <PostCard post={feature} variant="feature" priority />
            </div>
          </div>
          {hasList ? (
            <div>
              <h2 id="latest-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Latest
              </h2>
              <ul aria-labelledby="latest-heading" className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200">
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
