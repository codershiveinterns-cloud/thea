import Image from "next/image";

/**
 * Round author avatar for the public post page. Always sized (no layout shift);
 * falls back to initials when the author has no avatar. Decorative: the author's
 * name is always rendered next to it, so the image carries alt="".
 */

const SIZES = {
  32: { box: "h-8 w-8", text: "text-xs" },
  64: { box: "h-16 w-16", text: "text-lg" },
} as const;

export function authorInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

export function AuthorAvatar({
  name,
  avatar,
  size,
  className = "",
}: {
  name: string;
  avatar: string | null;
  size: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const base = `${s.box} shrink-0 rounded-full border border-line bg-bg-3 ${className}`;
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt=""
        width={size}
        height={size}
        className={`${base} object-cover`}
        // External avatar hosts are not in next.config images.remotePatterns; serve them as-is.
        unoptimized={/^https?:\/\//.test(avatar)}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${base} inline-flex items-center justify-center font-semibold text-fg-body ${s.text}`}>
      {authorInitials(name)}
    </span>
  );
}
