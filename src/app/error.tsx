"use client";
import { useEffect } from "react";

/** Root error boundary: anything not caught by a nested boundary lands here. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] unhandled error", error.digest ?? "", error.message);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6 font-sans">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm opacity-80">
        The page hit an unexpected error. Try again; if it keeps happening, check the server log{error.digest ? ` (ref ${error.digest})` : ""}.
      </p>
      <button type="button" onClick={reset} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </main>
  );
}
