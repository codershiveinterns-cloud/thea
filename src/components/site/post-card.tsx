import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { featuredImageFor, postPath, categoryPath } from "@/lib/seo";
import type { PostCard as PostCardData } from "@/lib/posts";
import { readStringArray } from "@/lib/validation";

type Variant = "default" | "compact" | "feature";

export function PostCard({ post, variant = "default", priority = false }: { post: PostCardData; variant?: Variant; priority?: boolean }) {
  const href = postPath(post.category.slug, post.slug);
  const builds = readStringArray(post.affectedBuilds);
  const image = featuredImageFor(post);

  if (variant === "compact") {
    return (
      <article className="flex gap-3 py-3">
        <div className="min-w-0 flex-1">
          <Link href={categoryPath(post.category.slug)} className="text-xs font-medium uppercase tracking-wide text-blue-700">
            {post.category.name}
          </Link>
          <h3 className="mt-0.5 text-base font-semibold leading-snug">
            <Link href={href} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {post.author.name} · <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
          </p>
        </div>
      </article>
    );
  }

  const feature = variant === "feature";
  return (
    <article className={`flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white ${feature ? "md:flex-row" : ""}`}>
      <Link href={href} className={`relative block aspect-[1200/630] w-full overflow-hidden bg-zinc-100 ${feature ? "md:w-1/2" : ""}`} aria-hidden tabIndex={-1}>
        <Image
          src={image}
          alt=""
          fill
          sizes={feature ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover"
          priority={priority}
          unoptimized={image.startsWith("/api/og")}
        />
      </Link>
      <div className={`flex flex-1 flex-col p-4 ${feature ? "md:p-6" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link href={categoryPath(post.category.slug)} className="font-medium uppercase tracking-wide text-blue-700">
            {post.category.name}
          </Link>
          {builds[0] ? <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{builds[0]}</span> : null}
        </div>
        <h3 className={`mt-2 font-semibold leading-snug ${feature ? "text-2xl" : "text-lg"}`}>
          <Link href={href} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className={`mt-2 text-sm leading-6 text-zinc-600 ${feature ? "line-clamp-4" : "line-clamp-3"}`}>{post.quickAnswer}</p>
        <p className="mt-auto pt-3 text-xs text-zinc-500">
          {post.author.name} · <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}
