import Link from "next/link";
import { SITE } from "@/lib/constants";

// Placeholder — the public site is built in phase 2.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
      <p className="text-zinc-600">{SITE.tagline}. The public site arrives in phase 2.</p>
      <Link href="/admin" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
        Open admin
      </Link>
    </main>
  );
}
