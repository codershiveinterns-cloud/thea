"use server";
/**
 * Post editor mutations: save (create/update), status transitions, delete.
 * Every input passes through postInputSchema; nothing is trusted from FormData directly.
 *
 * The client-safe serializer lives in src/components/admin/post-editor/serialize.ts
 * ("use server" modules may only export async functions).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { fdJson, fdLines, fdOptional, fdString } from "@/lib/form";
import { pingIndexNow } from "@/lib/indexing";
import { canTransition, STATUS_LABEL, TRANSITIONS, validateForPublish } from "@/lib/post-status";
import { slugify } from "@/lib/slug";
import { fieldErrors, postInputSchema, postStatusSchema, type PostInput } from "@/lib/validation";
import { failResult, okResult, type ActionResult } from "./types";

// ---------- form reading ----------

/** Post ids are cuids; anything blank, non-string or oversized never reaches Prisma. */
const postIdSchema = z.string().trim().min(1, "Missing post id").max(64, "Invalid post id");

const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");

/** Raw (unvalidated) object built from the editor's FormData. Zod does the real checking. */
function readPostForm(fd: FormData) {
  const title = fdString(fd, "title");
  const slug = fdString(fd, "slug").trim();
  return {
    title,
    // Fall back to a slug derived from the title so an empty slug field never blocks a save.
    slug: slug || slugify(title),
    categoryId: fdString(fd, "categoryId"),
    authorId: fdString(fd, "authorId"),
    quickAnswer: normalizeNewlines(fdString(fd, "quickAnswer")),
    body: normalizeNewlines(fdString(fd, "body")),
    affectedBuilds: fdJson<unknown>(fd, "affectedBuilds", []),
    faq: fdJson<unknown>(fd, "faq", []),
    metaTitle: fdString(fd, "metaTitle"),
    metaDescription: normalizeNewlines(fdString(fd, "metaDescription")),
    featuredImage: fdOptional(fd, "featuredImage"),
    screenshots: fdJson<unknown>(fd, "screenshots", []),
    sourceUrls: fdLines(fd, "sourceUrls"),
    generatedBy: fdOptional(fd, "generatedBy") ?? undefined,
    testedOnBuild: fdOptional(fd, "testedOnBuild"),
    lastVerifiedAt: fdOptional(fd, "lastVerifiedAt"),
    relatedPostIds: fdJson<unknown>(fd, "relatedPostIds", []),
  };
}

// ---------- shared persistence (used by savePost and transitionPost) ----------

type PersistResult = { ok: true; id: string } | { ok: false; message?: string; errors?: Record<string, string> };

/**
 * Validate the form, check referential integrity + slug uniqueness, then create or update.
 * Never throws for expected failures; returns field errors for the form instead.
 */
async function persistPost(postId: string | null, fd: FormData): Promise<PersistResult> {
  const parsed = postInputSchema.safeParse(readPostForm(fd));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  }
  const input: PostInput = parsed.data;
  const relatedIds = Array.from(new Set(input.relatedPostIds));
  const errors: Record<string, string> = {};

  if (postId && relatedIds.includes(postId)) errors.relatedPostIds = "A post cannot link to itself.";

  const [existing, slugOwner, category, author, relatedRows] = await Promise.all([
    postId ? db.post.findUnique({ where: { id: postId }, select: { id: true } }) : Promise.resolve(null),
    db.post.findUnique({ where: { slug: input.slug }, select: { id: true } }),
    db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    db.author.findUnique({ where: { id: input.authorId }, select: { id: true } }),
    relatedIds.length ? db.post.findMany({ where: { id: { in: relatedIds } }, select: { id: true } }) : Promise.resolve([]),
  ]);

  if (postId && !existing) return { ok: false, message: "This post no longer exists." };
  if (slugOwner && slugOwner.id !== postId) errors.slug = "Slug already used by another post";
  if (!category) errors.categoryId = "Pick a category";
  if (!author) errors.authorId = "Pick an author";
  if (relatedRows.length !== relatedIds.length && !errors.relatedPostIds) {
    errors.relatedPostIds = "One or more related posts no longer exist.";
  }
  if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", errors };

  const scalar = {
    title: input.title,
    slug: input.slug,
    categoryId: input.categoryId,
    authorId: input.authorId,
    quickAnswer: input.quickAnswer,
    body: input.body,
    affectedBuilds: input.affectedBuilds,
    faq: input.faq,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    featuredImage: input.featuredImage,
    screenshots: input.screenshots,
    sourceUrls: input.sourceUrls,
    generatedBy: input.generatedBy,
    testedOnBuild: input.testedOnBuild,
    lastVerifiedAt: input.lastVerifiedAt,
  };
  const relatedRefs = relatedIds.map((id) => ({ id }));

  try {
    if (postId) {
      await db.post.update({
        where: { id: postId },
        data: { ...scalar, relatedPosts: { set: relatedRefs } },
      });
      return { ok: true, id: postId };
    }
    const created = await db.post.create({
      data: { ...scalar, relatedPosts: { connect: relatedRefs } },
      select: { id: true },
    });
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[posts] save failed", err);
    return { ok: false, message: "Could not save the post. Check the server log." };
  }
}

function revalidateAdmin(postId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${postId}`);
}

function revalidatePublic(categorySlug: string, slug: string) {
  revalidatePath("/");
  revalidatePath(`/${categorySlug}`);
  revalidatePath(`/${categorySlug}/${slug}`);
}

// ---------- actions ----------

/** useActionState-compatible: create when the form has no `id`, otherwise update. */
export async function savePost(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const postId = fdOptional(formData, "id");
  const result = await persistPost(postId, formData);
  if (!result.ok) return result;

  revalidateAdmin(result.id);
  if (!postId) redirect(`/admin/posts/${result.id}?saved=1`);

  // Published posts render publicly: keep the public page fresh after edits.
  const post = await db.post.findUnique({
    where: { id: result.id },
    select: { slug: true, status: true, category: { select: { slug: true } } },
  });
  if (post?.status === "PUBLISHED") revalidatePublic(post.category.slug, post.slug);
  return okResult("Saved");
}

const TRANSITION_MESSAGE: Record<PostStatus, string> = {
  DRAFT: "Moved back to draft",
  REVIEW: "Sent to review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Unpublished and archived",
};

/**
 * Change a post's workflow status. When `formData` is given the current edits are saved
 * first so a status button never discards unsaved work.
 */
export async function transitionPost(rawPostId: string, to: PostStatus, formData?: FormData): Promise<ActionResult> {
  // Server actions are public endpoints: validate the id like every other input (a non-string would make Prisma throw).
  const parsedId = postIdSchema.safeParse(rawPostId);
  if (!parsedId.success) return failResult("Missing post id.");
  const postId = parsedId.data;
  const target = postStatusSchema.safeParse(to);
  if (!target.success) return failResult("Unknown status.");

  let savedPrefix = "";
  if (formData) {
    const saved = await persistPost(postId, formData);
    if (!saved.ok) return saved;
    savedPrefix = "Saved. ";
  }

  const post = await db.post.findUnique({
    where: { id: postId },
    include: { category: { select: { slug: true } }, relatedPosts: { select: { id: true } } },
  });
  if (!post) return failResult("This post no longer exists.");

  if (!canTransition(post.status, target.data)) {
    return failResult(`Cannot change status from ${STATUS_LABEL[post.status]} to ${STATUS_LABEL[target.data]}.`);
  }
  const transition = TRANSITIONS[post.status].find((t) => t.to === target.data);
  let warnings: string[] = [];
  if (transition?.requiresPublishCheck) {
    const check = validateForPublish(post);
    if (!check.ok) return { ok: false, message: check.errors.join(" ") };
    warnings = check.warnings;
  }

  const now = new Date();
  const data: Prisma.PostUpdateInput = { status: target.data };
  if (target.data === "PUBLISHED") {
    if (!post.publishedAt) data.publishedAt = now;
    if (!post.lastVerifiedAt) data.lastVerifiedAt = now;
  }
  // Leaving PUBLISHED (archive / back to draft) keeps publishedAt as history.

  try {
    await db.post.update({ where: { id: postId }, data });
  } catch (err) {
    console.error("[posts] transition failed", err);
    return failResult("Could not change the status. Check the server log.");
  }

  revalidateAdmin(postId);
  const publicPath = `/${post.category.slug}/${post.slug}`;
  let indexingNote = "";
  if (target.data === "PUBLISHED") {
    try {
      const ping = await pingIndexNow([publicPath]);
      if (ping.attempted && !ping.ok) indexingNote = ` ${ping.detail}`;
    } catch (err) {
      console.error("[posts] IndexNow ping failed", err);
    }
    revalidatePublic(post.category.slug, post.slug);
  } else if (post.status === "PUBLISHED") {
    revalidatePublic(post.category.slug, post.slug);
  }

  const warningText = warnings.length ? ` Warnings: ${warnings.join(" ")}` : "";
  return okResult(`${savedPrefix}${TRANSITION_MESSAGE[target.data]}.${warningText}${indexingNote}`);
}

/** Delete a post (implicit relatedPosts join rows are removed by Prisma) and go back to the list. */
export async function deletePost(rawPostId: string): Promise<void> {
  const parsedId = postIdSchema.safeParse(rawPostId);
  if (!parsedId.success) redirect("/admin/posts");
  const postId = parsedId.data;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { slug: true, status: true, category: { select: { slug: true } } },
  });
  if (!post) redirect("/admin/posts?deleted=1");

  let deleted = false;
  try {
    await db.post.delete({ where: { id: postId } });
    deleted = true;
  } catch (err) {
    console.error("[posts] delete failed", err);
  }
  if (!deleted) redirect(`/admin/posts/${postId}?deleteFailed=1`);

  revalidateAdmin(postId);
  if (post.status === "PUBLISHED") revalidatePublic(post.category.slug, post.slug);
  redirect("/admin/posts?deleted=1");
}
