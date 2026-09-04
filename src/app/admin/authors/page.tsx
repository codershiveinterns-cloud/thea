import type { Metadata } from "next";
import Link from "next/link";
import { AuthorAvatar } from "@/components/admin/authors/author-avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/card";
import { categoryBySlug } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { readStringArray } from "@/lib/validation";

export const metadata: Metadata = { title: "Authors" };

export default async function AuthorsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const sp = await searchParams;
  const authors = await db.author.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <>
      <PageHeader
        title="Authors"
        description="Profiles the pipeline assigns posts to. Each author's style prompt shapes the generated voice."
        actions={<LinkButton href="/admin/authors/new">New author</LinkButton>}
      />

      {sp.deleted === "1" ? (
        <div className="mb-4">
          <Notice kind="success">Author deleted.</Notice>
        </div>
      ) : null}

      {authors.length === 0 ? (
        <EmptyState
          title="No authors yet"
          description="The pipeline needs at least one author per category before it can assign posts."
          action={<LinkButton href="/admin/authors/new">Create the first author</LinkButton>}
        />
      ) : (
        <Card className="overflow-hidden" title={`${authors.length} author${authors.length === 1 ? "" : "s"}`}>
          <div className="-m-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium" colSpan={2}>
                    Author
                  </th>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 font-medium">Focus</th>
                  <th className="px-4 py-2 text-right font-medium">Posts</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {authors.map((a) => {
                  // Slugs are the badge keys; saveAuthor writes a set, but stay safe against older rows.
                  const focus = [...new Set(readStringArray(a.categoryFocus))];
                  return (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="w-14 py-2 pl-4 pr-0">
                        <AuthorAvatar name={a.name} avatar={a.avatar} />
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/authors/${a.id}`} className="font-medium text-zinc-900 hover:underline">
                          {a.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-600">{a.slug}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {focus.length === 0 ? (
                            <span className="text-xs text-zinc-400">None</span>
                          ) : (
                            focus.map((slug) => <Badge key={slug}>{categoryBySlug(slug)?.name ?? slug}</Badge>)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {a._count.posts > 0 ? (
                          <Link href={`/admin/posts?author=${encodeURIComponent(a.slug)}`} className="text-zinc-900 hover:underline">
                            {a._count.posts}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDate(a.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
