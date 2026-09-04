import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthorAvatar } from "@/components/admin/authors/author-avatar";
import { AuthorForm } from "@/components/admin/authors/author-form";
import { CreatedNotice } from "@/components/admin/authors/created-notice";
import { DeleteAuthorButton } from "@/components/admin/authors/delete-author-button";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { readStringArray } from "@/lib/validation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

async function loadAuthor(id: string) {
  return db.author.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const author = await db.author.findUnique({ where: { id }, select: { name: true } });
  return { title: author ? author.name : "Author" };
}

export default async function AuthorDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const author = await loadAuthor(id);
  if (!author) notFound();

  const postCount = author._count.posts;
  const postsHref = `/admin/posts?author=${encodeURIComponent(author.slug)}`;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <AuthorAvatar name={author.name} avatar={author.avatar} />
            {author.name}
          </span>
        }
        description={
          <>
            <span className="font-mono text-xs">/author/{author.slug}</span> · created {formatDate(author.createdAt)} ·{" "}
            {postCount} post{postCount === 1 ? "" : "s"}
          </>
        }
        actions={
          <>
            <LinkButton href={postsHref} intent="secondary">
              View posts ({postCount})
            </LinkButton>
            <LinkButton href="/admin/authors" intent="ghost">
              All authors
            </LinkButton>
          </>
        }
      />

      {/* Shown once after the create redirect; the component strips ?saved=1 from the URL so it does not stick. */}
      {sp.saved === "1" ? <CreatedNotice /> : null}

      <Card title="Profile">
        <AuthorForm
          initial={{
            id: author.id,
            name: author.name,
            slug: author.slug,
            avatar: author.avatar,
            bio: author.bio,
            categoryFocus: [...new Set(readStringArray(author.categoryFocus))],
            stylePrompt: author.stylePrompt,
          }}
        />
      </Card>

      <Card title="Danger zone" className="mt-6 border-red-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm text-zinc-700">
            {postCount > 0 ? (
              <>
                This author has {postCount} post{postCount === 1 ? "" : "s"}. Reassign{" "}
                <Link href={postsHref} className="text-blue-700 hover:underline">
                  {postCount === 1 ? "it" : "them"}
                </Link>{" "}
                to another author before deleting.
              </>
            ) : (
              <>No posts are assigned to this author, so it can be deleted.</>
            )}
          </div>
          <DeleteAuthorButton id={author.id} name={author.name} postCount={postCount} />
        </div>
      </Card>
    </div>
  );
}
