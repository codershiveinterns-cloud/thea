"use client";
import { useEffect } from "react";
import { Notice } from "@/components/ui/card";

/**
 * One-shot "Author created." banner for the redirect after create (/admin/authors/[id]?saved=1).
 * On mount it drops the `saved` flag from the URL (Next syncs native replaceState with its router),
 * so the next save, reload or bookmark renders the page without the stale notice.
 */
export function CreatedNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("saved")) return;
    url.searchParams.delete("saved");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return (
    <div className="mb-4">
      <Notice kind="success">Author created.</Notice>
    </div>
  );
}
