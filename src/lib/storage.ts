/**
 * File storage abstraction. Local dev writes to /public/uploads so files are served
 * statically by Next. Swap `storage` for a Supabase Storage adapter later without
 * touching callers (they only see StoredFile.url).
 */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_BYTES } from "./constants";

export interface StoredFile {
  /** Public URL/path to reference from <img> or next/image, e.g. /uploads/screenshots/123-name.png */
  url: string;
  size: number;
  contentType: string;
  originalName: string;
}

export interface StorageAdapter {
  save(file: File, opts?: { folder?: string }): Promise<StoredFile>;
  /** Best-effort delete by public URL. Silently ignores unknown/foreign URLs. */
  remove(url: string): Promise<void>;
}

export class StorageError extends Error {}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateUpload(file: File) {
  if (!(UPLOAD_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    throw new StorageError(`Unsupported file type "${file.type || "unknown"}". Use PNG, JPG, WebP or GIF.`);
  }
  if (file.size === 0) throw new StorageError("File is empty.");
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new StorageError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${UPLOAD_MAX_BYTES / 1024 / 1024} MB.`);
  }
}

function safeBaseName(name: string) {
  const base = path.basename(name).replace(/\.[^.]+$/, "");
  const cleaned = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return cleaned || "image";
}

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

class LocalDiskStorage implements StorageAdapter {
  async save(file: File, opts: { folder?: string } = {}): Promise<StoredFile> {
    validateUpload(file);
    const folder = (opts.folder ?? "misc").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
    const ext = EXT_BY_TYPE[file.type] ?? "bin";
    const fileName = `${Date.now()}-${safeBaseName(file.name)}.${ext}`;
    const dir = path.join(UPLOAD_ROOT, folder);
    await mkdir(dir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, fileName), bytes);
    return {
      url: `/uploads/${folder}/${fileName}`,
      size: file.size,
      contentType: file.type,
      originalName: file.name,
    };
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;
    const rel = url.slice("/uploads/".length);
    const target = path.normalize(path.join(UPLOAD_ROOT, rel));
    if (!target.startsWith(UPLOAD_ROOT + path.sep)) return; // path traversal guard
    try {
      await unlink(target);
    } catch {
      /* already gone */
    }
  }
}

export const storage: StorageAdapter = new LocalDiskStorage();
