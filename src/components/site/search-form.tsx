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
        className="h-11 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        Search
      </button>
    </form>
  );
}
