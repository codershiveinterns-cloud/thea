import Link from "next/link";
import { PostCard } from "@/components/site/post-card";
import type { PostCard as PostCardData } from "@/lib/posts";
import { categoryPath } from "@/lib/seo";
import { SectionHeading } from "./section-heading";

/** "Recent Windows updates" strip: newest four from windows-updates. Renders nothing when the category is empty. */
export function UpdatesStrip({ posts }: { posts: PostCardData[] }) {
  const items = posts.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="updates-heading" className="mt-16">
      <SectionHeading id="updates-heading" title="Recent Windows updates" href={categoryPath("windows-updates")} linkLabel="All Windows updates" />
      <ul className="mt-2 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((post) => (
          <li key={post.id} className="border-t border-line">
            <PostCard post={post} variant="compact" />
          </li>
        ))}
      </ul>
      <p className="sr-only">
        <Link href={categoryPath("windows-updates")}>All Windows updates</Link>
      </p>
    </section>
  );
}
