import Link from "next/link";
import { authorPath } from "@/lib/seo";
import { AuthorAvatar } from "./author-avatar";
import { POST_IDS } from "./ids";

/** Author box at the end of the article, linking to /author/[slug]. */
export function AuthorCard({ author }: { author: { name: string; slug: string; avatar: string | null; bio: string } }) {
  const href = authorPath(author.slug);
  return (
    <section aria-labelledby={POST_IDS.author} className="mt-12 flex gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
      <AuthorAvatar name={author.name} avatar={author.avatar} size={64} />
      <div className="min-w-0 flex-1">
        <p id={POST_IDS.author} className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Written by
        </p>
        <p className="mt-0.5 text-lg font-semibold text-zinc-900">
          <Link href={href} className="hover:underline">
            {author.name}
          </Link>
        </p>
        <p className="mt-2 break-words text-sm leading-6 text-zinc-600">{author.bio}</p>
        <Link href={href} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline">
          More from {author.name} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </section>
  );
}
