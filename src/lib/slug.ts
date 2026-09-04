/** URL-safe slug: lowercase ascii, hyphen separated, max 90 chars. Keeps hex error codes like 0x800f0922 intact. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
