import Link from "next/link";
import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";
import { categoryPath } from "@/lib/seo";

/** "Recent Windows updates" strip: newest four from windows-updates. Renders nothing when the category is empty. */
export function UpdatesStrip({ posts }: { posts: PostCardData[] }) {
  const items = posts.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="updates-heading" className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="updates-heading" className="text-2xl font-semibold tracking-tight">
          Recent Windows updates
        </h2>
        <Link
          href={categoryPath("windows-updates")}
          className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline"
        >
          All Windows updates <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
      <ul className="mt-2 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((post) => (
          <li key={post.id} className="border-t border-zinc-200">
            <PostCard post={post} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  );
}
