"use client";
import { useMemo, useState } from "react";
import { PostStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { RELATED_POSTS_MAX, RELATED_POSTS_MIN } from "@/lib/constants";
import type { CandidatePost, CategoryOption } from "./serialize";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  candidates: CandidatePost[];
  suggested: CandidatePost[];
  categories: CategoryOption[];
  error?: string;
};

/** Internal-link picker: suggestion chips, title search, and the ordered selected list. */
export function RelatedPostsPicker({ value, onChange, candidates, suggested, categories, error }: Props) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  const full = value.length >= RELATED_POSTS_MAX;
  const selected = value.map((id) => byId.get(id)).filter((c): c is CandidatePost => Boolean(c));
  const chips = suggested.filter((s) => !value.includes(s.id) && byId.has(s.id));
  const q = query.trim().toLowerCase();
  const results = q
    ? candidates.filter((c) => !value.includes(c.id) && (c.title.toLowerCase().includes(q) || c.slug.includes(q))).slice(0, 8)
    : [];

  function add(id: string) {
    if (full || value.includes(id)) return;
    onChange([...value, id]);
    setQuery("");
  }

  const countTone = value.length < RELATED_POSTS_MIN ? "text-amber-700" : "text-zinc-500";

  return (
    <div className="space-y-3">
      <input type="hidden" name="relatedPostIds" value={JSON.stringify(value)} />

      <div>
        <p className={`text-xs ${countTone}`}>
          {value.length} of {RELATED_POSTS_MIN}–{RELATED_POSTS_MAX} related posts
        </p>
        {selected.length ? (
          <ul className="mt-1 divide-y divide-zinc-100 rounded-md border border-zinc-200">
            {selected.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{c.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                    <span>{categoryName(c.categoryId)}</span>
                    <PostStatusBadge status={c.status} />
                  </p>
                </div>
                <Button size="sm" intent="ghost" onClick={() => onChange(value.filter((id) => id !== c.id))} aria-label={`Remove ${c.title}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 rounded-md border border-dashed border-zinc-300 px-3 py-3 text-center text-xs text-zinc-500">
            No related posts linked yet.
          </p>
        )}
      </div>

      {chips.length ? (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-700">Suggested</p>
          <div className="flex flex-wrap gap-1">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => add(c.id)}
                disabled={full}
                title={c.title}
                className="max-w-full truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + {c.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={full ? `Maximum of ${RELATED_POSTS_MAX} reached` : "Search posts by title…"}
          disabled={full}
          aria-label="Search posts to link"
          autoComplete="off"
        />
        {q ? (
          results.length ? (
            <ul className="mt-1 max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => add(c.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-zinc-900">{c.title}</span>
                      <span className="block text-xs text-zinc-500">{categoryName(c.categoryId)}</span>
                    </span>
                    <PostStatusBadge status={c.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">No posts match “{query}”.</p>
          )
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
