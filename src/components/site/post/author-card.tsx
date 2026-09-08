import Link from "next/link";
import { authorPath } from "@/lib/seo";
import { AuthorAvatar } from "./author-avatar";
import { POST_IDS } from "./ids";

/** Author box at the end of the article, linking to /author/[slug]. */
export function AuthorCard({ author }: { author: { name: string; slug: string; avatar: string | null; bio: string } }) {
  const href = authorPath(author.slug);
  return (
    <section aria-labelledby={POST_IDS.author} className="mt-12 flex flex-col gap-5 rounded-2xl border border-line bg-bg-2 p-6 sm:flex-row">
      <AuthorAvatar name={author.name} avatar={author.avatar} size={64} />
      <div className="min-w-0 flex-1">
        <p id={POST_IDS.author} className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
          Written by
        </p>
        <p className="mt-1 font-display text-xl font-bold text-fg">
          <Link href={href} className="hover:text-accent">
            {author.name}
          </Link>
        </p>
        <p className="mt-2 break-words text-sm leading-6 text-fg-body">{author.bio}</p>
        <Link href={href} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
          More from {author.name} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </section>
  );
}
