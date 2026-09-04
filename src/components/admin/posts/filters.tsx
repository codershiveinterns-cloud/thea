"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export type FilterOption = { value: string; label: string };

type Props = {
  statuses: FilterOption[];
  categories: FilterOption[];
  authors: FilterOption[];
  /** Current values from the URL; undefined means "all". `sort` is only set when non-default. */
  values: { status?: string; category?: string; author?: string; q?: string; sort?: string };
};

const FIELDS = ["status", "category", "author", "q", "sort"] as const;

/**
 * Plain GET form so it keeps working without JavaScript (the page ignores blank params).
 * With JS, selects auto-submit and the submit becomes a client-side navigation to a
 * clean URL with the empty fields dropped. Filtering always returns to page 1 because
 * `page` is deliberately not a form field.
 */
export function PostFilters({ statuses, categories, authors, values }: Props) {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    for (const key of FIELDS) {
      const v = fd.get(key);
      if (typeof v === "string" && v.trim() !== "") sp.set(key, v.trim());
    }
    const qs = sp.toString();
    router.push(qs ? `/admin/posts?${qs}` : "/admin/posts");
  }

  function autoSubmit(e: ChangeEvent<HTMLSelectElement>) {
    e.currentTarget.form?.requestSubmit();
  }

  return (
    <form
      method="get"
      action="/admin/posts"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Filter posts"
      className="flex flex-wrap items-end gap-2"
    >
      {values.sort ? <input type="hidden" name="sort" value={values.sort} /> : null}

      <div className="w-40">
        <label htmlFor="posts-filter-status" className="sr-only">
          Status
        </label>
        <Select id="posts-filter-status" name="status" defaultValue={values.status ?? ""} onChange={autoSubmit}>
          <option value="">All statuses</option>
          {statuses.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44">
        <label htmlFor="posts-filter-category" className="sr-only">
          Category
        </label>
        <Select id="posts-filter-category" name="category" defaultValue={values.category ?? ""} onChange={autoSubmit}>
          <option value="">All categories</option>
          {categories.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44">
        <label htmlFor="posts-filter-author" className="sr-only">
          Author
        </label>
        <Select id="posts-filter-author" name="author" defaultValue={values.author ?? ""} onChange={autoSubmit}>
          <option value="">All authors</option>
          {authors.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full sm:w-64">
        <label htmlFor="posts-filter-q" className="sr-only">
          Search titles
        </label>
        <Input id="posts-filter-q" type="search" name="q" defaultValue={values.q ?? ""} placeholder="Search titles…" />
      </div>

      <Button type="submit" intent="secondary">
        Filter
      </Button>
      <Link href="/admin/posts" className={buttonClass("ghost")}>
        Clear
      </Link>
    </form>
  );
}
