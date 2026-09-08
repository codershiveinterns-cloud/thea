import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { authorPath } from "@/lib/seo";
import { AuthorAvatar } from "./author-avatar";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Byline under the H1: avatar + author link · published date · "Updated" date (when meaningful) · reading time. */
export function PostMeta({ author, publishedAt, updatedAt, readingMinutes }: { author: { name: string; slug: string; avatar: string | null }; publishedAt: Date | null; updatedAt: Date; readingMinutes: number }) {
  const published = publishedAt ?? updatedAt;
  const showUpdated = updatedAt.getTime() - published.getTime() > ONE_DAY_MS;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line py-3 text-sm text-fg-muted">
      <Link href={authorPath(author.slug)} className="flex min-h-9 items-center gap-2.5 font-semibold text-fg hover:text-accent">
        <AuthorAvatar name={author.name} avatar={author.avatar} size={32} />
        {author.name}
      </Link>
      <Dot />
      <time dateTime={published.toISOString()} className="font-medium text-fg-body">
        {formatDate(published)}
      </time>
      {showUpdated ? (
        <>
          <Dot />
          <span>
            Updated <time dateTime={updatedAt.toISOString()}>{formatDate(updatedAt)}</time>
          </span>
        </>
      ) : null}
      <Dot />
      <span>{readingMinutes} min read</span>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="text-line">•</span>;
}
