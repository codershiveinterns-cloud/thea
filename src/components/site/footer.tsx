import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/constants";
import { categoryPath } from "@/lib/seo";
import { LEGAL_PAGES, legalPath } from "@/lib/legal";
import { Logo } from "./header";

const link = "inline-flex min-h-9 items-center text-fg-body hover:text-fg hover:underline";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-bg-2">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm leading-6 text-fg-body">
            {SITE.tagline}. Every fix is written for the current Windows 11 builds and re-checked when Microsoft ships a new update.
          </p>
        </div>
        <div>
          <p className="font-display font-semibold text-fg">Categories</p>
          <ul className="mt-3 space-y-1">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={categoryPath(c.slug)} className={link}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-display font-semibold text-fg">About</p>
          <ul className="mt-3 space-y-1">
            <li><Link href="/about" className={link}>About {SITE.name}</Link></li>
            <li><Link href="/editorial-policy" className={link}>Editorial policy</Link></li>
            <li><Link href="/contact" className={link}>Contact</Link></li>
            <li><a href="/feed.xml" className={link}>RSS feed</a></li>
          </ul>
        </div>
        <div>
          <p className="font-display font-semibold text-fg">Legal</p>
          <ul className="mt-3 space-y-1">
            {LEGAL_PAGES.map((p) => (
              <li key={p.slug}>
                <Link href={legalPath(p.slug)} className={link}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs leading-5 text-fg-muted sm:px-6">
          © {new Date().getFullYear()} {SITE.name}. Windows is a trademark of Microsoft Corporation. {SITE.name} is not affiliated with Microsoft.
        </p>
      </div>
    </footer>
  );
}
