"use server";
/**
 * Image upload used by the post editor (screenshots, featured image) and author avatars.
 * FormData fields: `file` (File), `folder` (screenshots | featured | avatars).
 */
import { logger } from "@/lib/log";
import { z } from "zod";
import { storage, StorageError } from "@/lib/storage";
import type { ActionResult } from "./types";

const folderSchema = z.enum(["screenshots", "featured", "avatars"]).default("screenshots");

const log = logger("admin:uploads");

export async function uploadImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "No file received." };
  const folder = folderSchema.safeParse(formData.get("folder") ?? undefined);
  if (!folder.success) return { ok: false, message: "Unknown upload folder." };
  try {
    const stored = await storage.save(file, { folder: folder.data });
    return { ok: true, data: { url: stored.url }, message: `Uploaded ${stored.originalName}` };
  } catch (err) {
    if (err instanceof StorageError) return { ok: false, message: err.message };
    log.error("failed", { error: err });
    return { ok: false, message: "Upload failed. Check the server log." };
  }
}

/** Remove a previously uploaded file (only /uploads/ paths; anything else is ignored). */
export async function deleteUpload(url: string): Promise<ActionResult> {
  await storage.remove(url);
  return { ok: true };
}
