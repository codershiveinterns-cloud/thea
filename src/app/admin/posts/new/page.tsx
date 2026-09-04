import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/post-editor/post-editor";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const [categories, authors, candidatePosts] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    db.post.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, categoryId: true, status: true, slug: true },
    }),
  ]);

  return (
    <PostEditor
      post={null}
      categories={categories}
      authors={authors}
      candidatePosts={candidatePosts}
      suggestedRelated={[]}
      publishCheck={null}
    />
  );
}
