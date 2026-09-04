"use server";
/**
 * Keyword queue mutations for /admin/keywords.
 *
 * The pipeline consumes QUEUED keywords newest-first. Editors add phrases here by hand
 * (source MANUAL); the feed ingester adds its own with source FEED. Phrases are deduped
 * case-insensitively with internal whitespace collapsed, on top of the DB unique index.
 */
import { Prisma, type KeywordStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fdLines, fdString } from "@/lib/form";
import { fieldErrors, keywordInputSchema, keywordStatusSchema, type KeywordInput } from "@/lib/validation";
import { failResult, okResult, type ActionResult } from "./types";

/** Upper bound for one bulk paste so a stray file dump can't hammer the DB. */
const BULK_MAX = 200;

export type AddKeywordData = { id: string; phrase: string };
export type BulkAddData = {
  added: number;
  /** Phrases skipped because they already exist (in the DB or earlier in the same paste). */
  duplicates: string[];
  /** Lines that failed validation (too short / too long). */
  invalid: string[];
};

const idSchema = z.string().trim().min(1, "Missing keyword id").max(64);

const STATUS_VERB: Record<KeywordStatus, string> = {
  QUEUED: "re-queued",
  USED: "marked as used",
  SKIPPED: "skipped",
};

function statusLabel(status: KeywordStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Collapse internal whitespace so "windows  update" and "windows update" are the same phrase. */
function normalizePhrase(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Dedupe key: normalised + lowercased. */
function phraseKey(raw: string): string {
  return normalizePhrase(raw).toLowerCase();
}

function revalidate() {
  revalidatePath("/admin/keywords");
  revalidatePath("/admin");
}

async function existingByKey(): Promise<Map<string, { phrase: string; status: KeywordStatus }>> {
  const rows = await db.keyword.findMany({ select: { phrase: true, status: true } });
  const map = new Map<string, { phrase: string; status: KeywordStatus }>();
  for (const row of rows) map.set(phraseKey(row.phrase), row);
  return map;
}

function duplicateMessage(existing: { phrase: string; status: KeywordStatus }): string {
  return `Already in the queue as '${existing.phrase}' (status ${statusLabel(existing.status)})`;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

/**
 * Add one keyword. FormData: phrase, categoryId. Source is always MANUAL — only the
 * feed ingester may write FEED, so any client-supplied `source` field is ignored.
 * Shaped for React 19 `useActionState(addKeyword, null)`.
 */
export async function addKeyword(
  _prev: ActionResult<AddKeywordData> | null,
  formData: FormData,
): Promise<ActionResult<AddKeywordData>> {
  const parsed = keywordInputSchema.safeParse({
    phrase: normalizePhrase(fdString(formData, "phrase")),
    categoryId: fdString(formData, "categoryId"),
    source: "MANUAL",
  });
  if (!parsed.success) return failResult("Check the form.", fieldErrors(parsed.error));

  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true, name: true },
  });
  if (!category) return failResult("Check the form.", { categoryId: "Unknown category" });

  const existing = (await existingByKey()).get(phraseKey(parsed.data.phrase));
  if (existing) return failResult("Not added.", { phrase: duplicateMessage(existing) });

  try {
    const row = await db.keyword.create({ data: parsed.data, select: { id: true, phrase: true } });
    revalidate();
    return okResult(`Added "${row.phrase}" to ${category.name}.`, { id: row.id, phrase: row.phrase });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Lost a race with a concurrent add: look the winner up so the message matches
      // the pre-check path (exact match first, then the case-insensitive map).
      const winner =
        (await db.keyword.findUnique({
          where: { phrase: parsed.data.phrase },
          select: { phrase: true, status: true },
        })) ?? (await existingByKey()).get(phraseKey(parsed.data.phrase));
      return failResult("Not added.", {
        phrase: winner ? duplicateMessage(winner) : "Already in the queue.",
      });
    }
    console.error("[keywords] add failed", err);
    return failResult("Could not save the keyword. Check the server log.");
  }
}

/**
 * Add many keywords at once. FormData: phrases (textarea, one per line), categoryId.
 * Source is always MANUAL. Reports how many were added, and which lines were
 * duplicates or invalid. Returns ok:true even when nothing was added, so the
 * caller can show the skipped lists; `data.added` says whether anything changed.
 */
export async function addKeywordsBulk(
  _prev: ActionResult<BulkAddData> | null,
  formData: FormData,
): Promise<ActionResult<BulkAddData>> {
  const lines = fdLines(formData, "phrases");
  if (lines.length === 0) {
    return failResult("Nothing to add.", { phrases: "Enter at least one phrase (one per line)." });
  }
  if (lines.length > BULK_MAX) {
    return failResult("Too many lines.", {
      phrases: `Add at most ${BULK_MAX} phrases at a time (you pasted ${lines.length}).`,
    });
  }

  const categoryId = fdString(formData, "categoryId");
  const category = categoryId
    ? await db.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true } })
    : null;
  if (!category) return failResult("Check the form.", { categoryId: "Pick a category" });

  const existing = await existingByKey();
  const seenInPaste = new Set<string>();
  const toCreate: KeywordInput[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];

  for (const raw of lines) {
    const parsed = keywordInputSchema.safeParse({
      phrase: normalizePhrase(raw),
      categoryId: category.id,
      source: "MANUAL",
    });
    if (!parsed.success) {
      invalid.push(raw);
      continue;
    }
    const key = phraseKey(parsed.data.phrase);
    if (existing.has(key) || seenInPaste.has(key)) {
      duplicates.push(parsed.data.phrase);
      continue;
    }
    seenInPaste.add(key);
    toCreate.push(parsed.data);
  }

  // Sequential creates (SQLite has no createMany skipDuplicates); a race on the unique
  // index is folded into the duplicates list instead of failing the whole paste.
  let added = 0;
  for (const data of toCreate) {
    try {
      await db.keyword.create({ data, select: { id: true } });
      added += 1;
    } catch (err) {
      if (isUniqueViolation(err)) {
        duplicates.push(data.phrase);
        continue;
      }
      console.error("[keywords] bulk add failed", err);
      if (added > 0) revalidate();
      return failResult(
        `Stopped after adding ${added} keyword${added === 1 ? "" : "s"}: a save failed. Check the server log.`,
      );
    }
  }
  if (added > 0) revalidate();

  const parts = [`Added ${added} keyword${added === 1 ? "" : "s"} to ${category.name}.`];
  if (duplicates.length) parts.push(`Skipped ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"}.`);
  if (invalid.length) parts.push(`Skipped ${invalid.length} invalid line${invalid.length === 1 ? "" : "s"}.`);

  return okResult(parts.join(" "), { added, duplicates, invalid });
}

/** Move a keyword between QUEUED / USED / SKIPPED. */
export async function setKeywordStatus(id: string, status: KeywordStatus): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = keywordStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return failResult("Invalid request.");

  try {
    const row = await db.keyword.update({
      where: { id: parsedId.data },
      data: { status: parsedStatus.data },
      select: { phrase: true, status: true },
    });
    revalidate();
    return { ok: true, message: `"${row.phrase}" ${STATUS_VERB[row.status]}.` };
  } catch (err) {
    if (isNotFound(err)) return failResult("That keyword no longer exists.");
    console.error("[keywords] status update failed", err);
    return failResult("Could not update the keyword. Check the server log.");
  }
}

/** Permanently remove a keyword from the queue. */
export async function deleteKeyword(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return failResult("Invalid request.");

  try {
    const row = await db.keyword.delete({ where: { id: parsedId.data }, select: { phrase: true } });
    revalidate();
    return { ok: true, message: `Deleted "${row.phrase}".` };
  } catch (err) {
    if (isNotFound(err)) return failResult("That keyword was already deleted.");
    console.error("[keywords] delete failed", err);
    return failResult("Could not delete the keyword. Check the server log.");
  }
}
