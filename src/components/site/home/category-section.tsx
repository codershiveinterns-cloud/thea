import { PostCard } from "@/components/site/post-card";
import type { CATEGORIES } from "@/lib/constants";
import type { PostCard as PostCardData } from "@/lib/posts";
import { categoryPath } from "@/lib/seo";
import { SectionHeading } from "./section-heading";

type Category = (typeof CATEGORIES)[number];

/** One home-page section per category: dense, scannable rows with the date column on the left. */
export function CategorySection({ category, posts }: { category: Category; posts: PostCardData[] }) {
  const items = posts.slice(0, 4);
  if (items.length === 0) return null;
  const headingId = `category-${category.slug}`;
  const href = categoryPath(category.slug);

  return (
    <section aria-labelledby={headingId} className="mt-16">
      <SectionHeading id={headingId} title={category.name} description={category.description} href={href} linkLabel={`All ${category.name}`} />
      <ul className="divide-y divide-line">
        {items.map((post) => (
          <li key={post.id}>
            <PostCard post={post} variant="row" />
          </li>
        ))}
      </ul>
    </section>
  );
}
