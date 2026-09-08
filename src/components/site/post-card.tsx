import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { featuredImageFor, postPath, categoryPath } from "@/lib/seo";
import type { PostCard as PostCardData } from "@/lib/posts";
import { readStringArray } from "@/lib/validation";

/**
 * lead    — the dominant latest-story block on the home page (big image, display headline)
 * card    — image card for grids
 * row     — dense list row: date column, category, title, byline, version tag (no image)
 * compact — title + byline only, for tight lists (related guides, latest column)
 */
type Variant = "lead" | "card" | "row" | "compact";

export function VersionTag({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md bg-accent-soft px-2 text-[11px] font-semibold tracking-wide text-accent ${className}`}>
      {label}
    </span>
  );
}

export function CategoryLabel({ slug, name }: { slug: string; name: string }) {
  return (
    <Link href={categoryPath(slug)} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent hover:underline">
      {name}
    </Link>
  );
}

function Byline({ post, className = "" }: { post: PostCardData; className?: string }) {
  return (
    <p className={`text-xs text-fg-muted ${className}`}>
      <span className="font-medium text-fg-body">{post.author.name}</span>
      <span aria-hidden="true"> · </span>
      <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
    </p>
  );
}

export function PostCard({ post, variant = "card", priority = false }: { post: PostCardData; variant?: Variant; priority?: boolean }) {
  const href = postPath(post.category.slug, post.slug);
  const builds = readStringArray(post.affectedBuilds);
  const image = featuredImageFor(post);
  const tag = builds[0];

  if (variant === "compact") {
    return (
      <article className="py-3">
        <CategoryLabel slug={post.category.slug} name={post.category.name} />
        <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-fg">
          <Link href={href} className="hover:text-accent">
            {post.title}
          </Link>
        </h3>
        <Byline post={post} className="mt-1.5" />
      </article>
    );
  }

  if (variant === "row") {
    return (
      <article className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
        <time dateTime={post.publishedAt?.toISOString()} className="text-xs font-medium tabular-nums text-fg-muted sm:pt-1">
          {formatDate(post.publishedAt)}
        </time>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryLabel slug={post.category.slug} name={post.category.name} />
            {tag ? <VersionTag label={tag} /> : null}
          </div>
          <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-fg">
            <Link href={href} className="hover:text-accent">
              {post.title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-fg-body">{post.quickAnswer}</p>
          <p className="mt-2 text-xs text-fg-muted">
            By <span className="font-medium text-fg-body">{post.author.name}</span>
          </p>
        </div>
      </article>
    );
  }

  const lead = variant === "lead";
  return (
    <article className={`group flex flex-col ${lead ? "gap-5" : "gap-4"}`}>
      <Link href={href} className="relative block aspect-[1200/630] w-full overflow-hidden rounded-xl bg-bg-2 ring-1 ring-line" aria-hidden tabIndex={-1}>
        <Image
          src={image}
          alt=""
          fill
          sizes={lead ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          priority={priority}
          unoptimized={image.startsWith("/api/og")}
        />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryLabel slug={post.category.slug} name={post.category.name} />
          {tag ? <VersionTag label={tag} /> : null}
        </div>
        <h3 className={`mt-2 font-display font-bold leading-tight tracking-tight text-fg ${lead ? "text-2xl sm:text-3xl lg:text-4xl" : "text-lg"}`}>
          <Link href={href} className="hover:text-accent">
            {post.title}
          </Link>
        </h3>
        <p className={`mt-2 text-fg-body ${lead ? "line-clamp-3 text-base leading-7 sm:text-lg" : "line-clamp-2 text-sm leading-6"}`}>{post.quickAnswer}</p>
        <Byline post={post} className="mt-3" />
      </div>
    </article>
  );
}
