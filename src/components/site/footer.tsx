import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/constants";
import { categoryPath } from "@/lib/seo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
        <div>
          <p className="text-base font-bold text-zinc-900">{SITE.name}</p>
          <p className="mt-2 max-w-xs text-zinc-600">{SITE.tagline}. Every fix is written for the current Windows 11 builds and re-checked when Microsoft ships a new update.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">Categories</p>
          <ul className="mt-2 space-y-1">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={categoryPath(c.slug)} className="text-zinc-600 hover:text-zinc-900 hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">About</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/about" className="text-zinc-600 hover:text-zinc-900 hover:underline">About {SITE.name}</Link></li>
            <li><Link href="/editorial-policy" className="text-zinc-600 hover:text-zinc-900 hover:underline">Editorial policy</Link></li>
            <li><Link href="/contact" className="text-zinc-600 hover:text-zinc-900 hover:underline">Contact</Link></li>
            <li><a href="/feed.xml" className="text-zinc-600 hover:text-zinc-900 hover:underline">RSS feed</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-200">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500">
          © {new Date().getFullYear()} {SITE.name}. Windows is a trademark of Microsoft Corporation. {SITE.name} is not affiliated with Microsoft.
        </p>
      </div>
    </footer>
  );
}
