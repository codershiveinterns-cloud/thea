"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/authors", label: "Authors" },
  { href: "/admin/keywords", label: "Keywords" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
