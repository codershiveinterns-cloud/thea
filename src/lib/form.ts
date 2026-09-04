/** Small helpers for reading FormData in server actions. All values are still validated with Zod afterwards. */

export function fdString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export function fdOptional(fd: FormData, key: string): string | null {
  const v = fdString(fd, key).trim();
  return v === "" ? null : v;
}

/** One value per line (textarea) or repeated inputs with the same name. Blank lines dropped. */
export function fdLines(fd: FormData, key: string): string[] {
  const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
  return all
    .flatMap((v) => v.split(/\r?\n/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function fdBool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Parse a JSON-encoded hidden input; returns fallback on any failure. */
export function fdJson<T>(fd: FormData, key: string, fallback: T): T {
  const raw = fd.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
