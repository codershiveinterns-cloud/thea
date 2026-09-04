/** Round avatar with an initials fallback. Safe in server and client components. */

const SIZES = { sm: "h-10 w-10 text-sm", md: "h-16 w-16 text-lg" } as const;

export function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

export function AuthorAvatar({
  name,
  avatar,
  size = "sm",
  className = "",
}: {
  name: string;
  avatar: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const dims = SIZES[size];
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        className={`${dims} shrink-0 rounded-full border border-zinc-200 bg-zinc-100 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-700 ${className}`}
    >
      {authorInitials(name)}
    </span>
  );
}
