import type { Metadata } from "next";
import Link from "next/link";
import { AuthorAvatar } from "@/components/site/post/author-avatar";
import { StaticPage } from "@/components/site/static-page";
import { CATEGORIES, SITE } from "@/lib/constants";
import { listAuthorsWithPublished } from "@/lib/posts";
import { authorPath, buildMetadata, categoryPath } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/about";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `What ${SITE.name} is, who writes it, how articles are researched and tested, and how the site is funded.`,
  path: PATH,
});

function AuthorCard({ author }: { author: { slug: string; name: string; avatar: string | null; bio: string } }) {
  return (
    <article className="flex gap-4 rounded-xl border border-line p-4">
      {/* Shared avatar: sized, lazy, initials fallback, and external https avatars served unoptimized (no remotePatterns configured). */}
      <AuthorAvatar name={author.name} avatar={author.avatar} size={64} />
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-snug text-fg">
          <Link href={authorPath(author.slug)} className="hover:underline">
            {author.name}
          </Link>
        </h3>
        <p className="mt-1 break-words text-sm leading-6 text-fg-body">{author.bio}</p>
      </div>
    </article>
  );
}

export default async function AboutPage() {
  const authors = await listAuthorsWithPublished();

  return (
    <StaticPage
      title={`About ${SITE.name}`}
      intro={`${SITE.name} covers each Windows update on the day it ships, and keeps a tested fix on file for the error codes and breakages that follow.`}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "About", path: PATH },
      ]}
    >
      <h2>What {SITE.name} is</h2>
      <p>
        {SITE.name} is a Windows help site with two jobs. When Microsoft ships a Windows 11 update, we publish what changed, what it breaks and
        whether to install it. When an update fails or an error code appears, we publish a fix that works on the build people are running
        today, not one from three years ago.
      </p>
      <p>Everything is filed under one of five categories:</p>
      <ul>
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={categoryPath(c.slug)}>{c.name}</Link> — {c.description}
          </li>
        ))}
      </ul>

      <h2>Who writes it</h2>
      <p>
        {SITE.name} is written by a small team, each covering the categories they know best. Every author page lists their published
        articles, and every article names the person responsible for it.
      </p>
      {authors.length > 0 ? (
        <div className="my-6 grid gap-4 sm:grid-cols-2">
          {authors.map((author) => (
            <AuthorCard key={author.slug} author={author} />
          ))}
        </div>
      ) : (
        <p>Author profiles appear here as soon as their first articles are published.</p>
      )}

      <h2>How articles are made</h2>
      <p>
        Every article starts from official Microsoft material: release notes, support articles and Windows Insider blog posts. We do not
        invent KB numbers, build numbers or error codes — if an identifier is not in the source, it is not in the article.
      </p>
      <p>
        First drafts are AI-assisted: a model writes the draft from those sources, and an automated check then scores it for structure,
        thin content and identifiers that do not appear in the sources. Anything that fails waits in a review queue for a human editor.
      </p>
      <p>
        A human editor reviews each article against its sources and tests the steps on a real PC — usually before it is published.
        Articles that pass the automated check can be published automatically so that same-day coverage is available quickly; the hands-on
        check then follows. Until it has happened, the article shows <strong>Verified: pending</strong> instead of a build number — treat
        it as a starting point and check back. Once checked, the article shows the build it was tested on and the date it was last
        verified.
      </p>
      <p>
        When Microsoft ships a new build, affected articles are re-checked and the verified date is updated. The full process, including
        how corrections work, is in our <Link href="/editorial-policy">editorial policy</Link>.
      </p>

      <h2>Independence</h2>
      <p>
        {SITE.name} is independent. It is not affiliated with, endorsed by or sponsored by Microsoft, and Windows is a trademark of
        Microsoft Corporation. We link to Microsoft’s own documentation because it is the primary source, not because of any relationship.
      </p>

      <h2>How the site makes money</h2>
      <p>
        {SITE.name} is funded by display advertising. The ad slots are managed by us, sit in fixed positions on article pages and are always
        labelled <strong>Advertisement</strong>. There are no affiliate links, no sponsored fixes and no paid “repair tool” recommendations —
        if an article recommends a tool, it is because that is the fix.
      </p>
      <p>
        Spotted a mistake? The <Link href="/contact">contact page</Link> explains how to report it and what to include.
      </p>
    </StaticPage>
  );
}
