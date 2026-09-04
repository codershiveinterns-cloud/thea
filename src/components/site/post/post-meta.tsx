import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { authorPath } from "@/lib/seo";
import { AuthorAvatar } from "./author-avatar";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Byline under the H1: avatar + author link · published date · "Updated" date (when meaningful) · reading time. */
export function PostMeta({
  author,
  publishedAt,
  updatedAt,
  readingMinutes,
}: {
  author: { name: string; slug: string; avatar: string | null };
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number;
}) {
  const published = publishedAt ?? updatedAt;
  const showUpdated = updatedAt.getTime() - published.getTime() > ONE_DAY_MS;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
      <Link href={authorPath(author.slug)} className="flex min-h-11 items-center gap-2 font-medium text-zinc-700 hover:text-zinc-900 hover:underline">
        <AuthorAvatar name={author.name} avatar={author.avatar} size={32} />
        {author.name}
      </Link>
      <Separator />
      <time dateTime={published.toISOString()}>{formatDate(published)}</time>
      {showUpdated ? (
        <>
          <Separator />
          <span>
            Updated <time dateTime={updatedAt.toISOString()}>{formatDate(updatedAt)}</time>
          </span>
        </>
      ) : null}
      <Separator />
      <span>{readingMinutes} min read</span>
    </div>
  );
}

function Separator() {
  return <span aria-hidden="true">·</span>;
}
