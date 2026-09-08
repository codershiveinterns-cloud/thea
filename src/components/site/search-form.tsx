import { SITE } from "@/lib/constants";

/**
 * Plain GET form → /search?q=… — a server component with no JavaScript, shared by /search and
 * the 404 page. The native constraints only give quick feedback; /search re-validates q.
 */
export function SearchForm({
  defaultValue = "",
  id = "site-search",
  className = "",
}: {
  defaultValue?: string;
  /** Override when two forms could render on one page (the label is tied to it). */
  id?: string;
  className?: string;
}) {
  return (
    <form action="/search" method="get" role="search" className={`flex gap-2 ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search {SITE.name}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Error code, KB number or problem"
        required
        minLength={2}
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        className="h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-base text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Search
      </button>
    </form>
  );
}
