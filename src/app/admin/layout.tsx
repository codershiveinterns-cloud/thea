import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/nav";
import { SITE } from "@/lib/constants";

// Admin pages always read live data — never prerender them at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s · ${SITE.name} admin` },
  robots: { index: false, follow: false },
};

// Auth is deferred (see CLAUDE.md). When it lands, gate this layout — every admin
// route lives under /admin and every admin mutation under src/lib/admin/.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-base font-semibold tracking-tight">
            {SITE.name} <span className="text-zinc-400">admin</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            View site →
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-48 md:shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
