/**
 * Search-engine notifications on publish/update.
 * The key comes from env INDEXNOW_KEY (Vercel) or Setting INDEXNOW_KEY (admin), and the same value
 * must be served as /{key}.txt from public/. With no key set the ping is skipped and logged.
 */
import { SITE, SETTING_KEYS } from "./constants";
import { getSetting } from "./settings";

export type IndexingResult = { attempted: boolean; ok: boolean; detail: string };

export async function pingIndexNow(paths: string[]): Promise<IndexingResult> {
  const key = (process.env.INDEXNOW_KEY?.trim() || (await getSetting(SETTING_KEYS.INDEXNOW_KEY))).trim();
  const urls = paths.map((p) => (p.startsWith("http") ? p : `${SITE.url}${p}`));
  if (!key) {
    console.info("[indexing] IndexNow skipped (no INDEXNOW_KEY):", urls.join(", "));
    return { attempted: false, ok: true, detail: "IndexNow key not set; skipped." };
  }
  if (!SITE.url.startsWith("https://")) {
    return { attempted: false, ok: true, detail: "IndexNow only accepts public https hosts; skipped on localhost." };
  }
  try {
    const host = new URL(SITE.url).host;
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${SITE.url}/${key}.txt`, urlList: urls }),
    });
    return { attempted: true, ok: res.ok, detail: `IndexNow responded ${res.status}` };
  } catch (err) {
    return { attempted: true, ok: false, detail: `IndexNow failed: ${(err as Error).message}` };
  }
}
