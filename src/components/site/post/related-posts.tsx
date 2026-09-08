import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";
import { POST_IDS } from "./ids";

/** Internal links to related guides (published only), as an image-card grid. */
export function RelatedPosts({ posts }: { posts: PostCardData[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby={POST_IDS.related} className="mt-16 border-t border-line pt-10">
      <h2 id={POST_IDS.related} className="font-display text-2xl font-bold tracking-tight text-fg">
        Related guides
      </h2>
      <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <li key={p.id}>
            <PostCard post={p} variant="card" />
          </li>
        ))}
      </ul>
    </section>
  );
}
