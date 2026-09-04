import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";

type Props = {
  posts: PostCardData[];
  /** Mark the first card's image as the LCP candidate (only on pages where it is above the fold). */
  firstPriority?: boolean;
  className?: string;
};

/**
 * Responsive card grid (1 / 2 / 3 columns). The breakpoints match the `sizes`
 * hint baked into PostCard so next/image picks the right source width.
 */
export function PostGrid({ posts, firstPriority = false, className = "" }: Props) {
  return (
    <ul role="list" className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {posts.map((post, i) => (
        // Single-cell grid so the card stretches to the row height (equal-height cards).
        <li key={post.id} className="grid">
          <PostCard post={post} priority={firstPriority && i === 0} />
        </li>
      ))}
    </ul>
  );
}
