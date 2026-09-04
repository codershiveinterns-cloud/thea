import Link from "next/link";
import { PostCard } from "@/components/site/post-card";
import type { CATEGORIES } from "@/lib/constants";
import type { PostCard as PostCardData } from "@/lib/posts";
import { categoryPath } from "@/lib/seo";

type Category = (typeof CATEGORIES)[number];

/** One home-page section per category: linked h2, description, up to three cards. Skips empty categories. */
export function CategorySection({ category, posts }: { category: Category; posts: PostCardData[] }) {
  const items = posts.slice(0, 3);
  if (items.length === 0) return null;

  const headingId = `category-${category.slug}`;
  const href = categoryPath(category.slug);

  return (
    <section aria-labelledby={headingId} className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-3xl">
          <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
            <Link href={href} className="hover:underline">
              {category.name}
            </Link>
          </h2>
          <p className="mt-1 text-zinc-600">{category.description}</p>
        </div>
        <Link href={href} className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline">
          All {category.name} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          // `grid` makes the card stretch to the row height so footers line up across the row.
          <li key={post.id} className="grid">
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
