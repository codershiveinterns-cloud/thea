"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Public-site error boundary: keeps the site chrome, offers retry and a way home. */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[site] render error", error.digest ?? "", error.message);
  }, [error]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Error</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">This page could not be shown</h1>
      <p className="mt-4 leading-7 text-fg-body">Something failed while building this page. You can try again, or head back to the front page.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg">
          Try again
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-fg hover:bg-bg-2">
          Front page
        </Link>
      </div>
      {error.digest ? <p className="mt-6 text-xs text-fg-muted">Reference: {error.digest}</p> : null}
    </div>
  );
}
