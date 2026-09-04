import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor/post-editor";
import { serializePost } from "@/components/admin/post-editor/serialize";
import { RELATED_POSTS_MAX } from "@/lib/constants";
import { db } from "@/lib/db";
import { validateForPublish } from "@/lib/post-status";
import { suggestRelatedPosts } from "@/lib/post-utils";

export const metadata: Metadata = { title: "Edit post" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPostPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const [post, categories, authors, candidatePosts] = await Promise.all([
    db.post.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, slug: true } },
        relatedPosts: { select: { id: true, title: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    db.post.findMany({
      where: { id: { not: id } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, categoryId: true, status: true, slug: true },
    }),
  ]);
  if (!post) notFound();

  const suggestedRelated = suggestRelatedPosts(post, candidatePosts, RELATED_POSTS_MAX);
  const publishCheck = validateForPublish(post);

  const flash =
    sp.saved === "1"
      ? { kind: "success" as const, text: "Post created. You can now send it to review." }
      : sp.deleteFailed === "1"
        ? { kind: "error" as const, text: "The post could not be deleted. Check the server log." }
        : null;

  return (
    <PostEditor
      post={serializePost(post)}
      categories={categories}
      authors={authors}
      candidatePosts={candidatePosts}
      suggestedRelated={suggestedRelated}
      publishCheck={publishCheck}
      flash={flash}
    />
  );
}
