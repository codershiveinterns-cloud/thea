"use server";
/**
 * Authors CRUD server actions. Every input goes through authorInputSchema;
 * categoryFocus is written to the Json column as a plain string[] of category slugs.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { fdOptional, fdString } from "@/lib/form";
import { authorInputSchema, fieldErrors } from "@/lib/validation";
import { failResult, okResult, type ActionResult } from "./types";

export type AuthorFormState = ActionResult<{ id: string }>;

/** Author ids are cuids; anything longer or blank never reaches Prisma. */
const idSchema = z.string().trim().min(1, "Missing author id").max(64, "Invalid author id");

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function revalidateAuthorPaths(id: string, ...slugs: string[]) {
  revalidatePath("/admin/authors");
  revalidatePath(`/admin/authors/${id}`);
  for (const slug of slugs) revalidatePath(`/author/${slug}`);
}

/**
 * Create or update an author (hidden `id` field decides which).
 * Create → redirects to /admin/authors/[id]?saved=1. Update → returns ok "Saved".
 */
export async function saveAuthor(prevState: AuthorFormState | null, formData: FormData): Promise<AuthorFormState> {
  const rawId = fdOptional(formData, "id");
  let id: string | null = null;
  if (rawId !== null) {
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) return failResult("Invalid author id.");
    id = parsedId.data;
  }

  // Checkboxes submit one value each, but a crafted request can repeat a slug; the Json column must stay a set.
  const categoryFocus = [...new Set(formData.getAll("categoryFocus").filter((v): v is string => typeof v === "string"))];

  const parsed = authorInputSchema.safeParse({
    name: fdString(formData, "name"),
    slug: fdString(formData, "slug"),
    avatar: fdOptional(formData, "avatar"),
    bio: fdString(formData, "bio"),
    categoryFocus,
    stylePrompt: fdString(formData, "stylePrompt"),
  });
  if (!parsed.success) {
    return failResult("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }
  const input = parsed.data;
  const slugTaken = { slug: "Another author already uses this slug" };

  const clash = await db.author.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (clash && clash.id !== id) return failResult("Please fix the highlighted fields.", slugTaken);

  const data = {
    name: input.name,
    slug: input.slug,
    avatar: input.avatar,
    bio: input.bio,
    categoryFocus: input.categoryFocus,
    stylePrompt: input.stylePrompt,
  };

  if (id) {
    const existing = await db.author.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) return failResult("This author no longer exists.");
    try {
      await db.author.update({ where: { id }, data });
    } catch (err) {
      if (isUniqueViolation(err)) return failResult("Please fix the highlighted fields.", slugTaken);
      console.error("[authors] update failed", err);
      return failResult("Could not save the author. Check the server log.");
    }
    revalidateAuthorPaths(id, existing.slug, input.slug);
    return okResult("Saved", { id });
  }

  let createdId: string;
  try {
    const created = await db.author.create({ data, select: { id: true } });
    createdId = created.id;
  } catch (err) {
    if (isUniqueViolation(err)) return failResult("Please fix the highlighted fields.", slugTaken);
    console.error("[authors] create failed", err);
    return failResult("Could not create the author. Check the server log.");
  }
  revalidateAuthorPaths(createdId, input.slug);
  redirect(`/admin/authors/${createdId}?saved=1`);
}

/** Delete an author with no posts. Redirects to /admin/authors?deleted=1 on success. */
export async function deleteAuthor(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return failResult("Missing author id.");
  const authorId = parsedId.data;

  const author = await db.author.findUnique({
    where: { id: authorId },
    select: { slug: true, _count: { select: { posts: true } } },
  });
  if (!author) return failResult("This author no longer exists.");

  const n = author._count.posts;
  if (n > 0) return failResult(`Reassign ${n} post${n === 1 ? "" : "s"} before deleting`);

  try {
    await db.author.delete({ where: { id: authorId } });
  } catch (err) {
    console.error("[authors] delete failed", err);
    return failResult("Could not delete the author. Check the server log.");
  }
  revalidateAuthorPaths(authorId, author.slug);
  redirect("/admin/authors?deleted=1");
}
