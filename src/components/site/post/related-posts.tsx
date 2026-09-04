import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";
import { POST_IDS } from "./ids";

/** Internal links to related guides (published only). Rendered as compact cards in a bordered list. */
export function RelatedPosts({ posts }: { posts: PostCardData[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby={POST_IDS.related} className="mt-12">
      <h2 id={POST_IDS.related} className="text-2xl font-semibold tracking-tight text-zinc-900">
        Related guides
      </h2>
      <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 px-4">
        {posts.map((p) => (
          <li key={p.id}>
            <PostCard post={p} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  );
}
