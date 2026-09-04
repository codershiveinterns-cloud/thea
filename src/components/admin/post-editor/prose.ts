/**
 * Prose styling for rendered markdown without @tailwindcss/typography.
 * Uses Tailwind v4 arbitrary child variants so react-markdown output needs no component map.
 */
export const PROSE_CLASS = [
  "text-sm leading-6 text-zinc-800 break-words",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:border-zinc-200 [&_h2]:pb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold",
  "[&_p]:my-3",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
  "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2",
  "[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre]:text-zinc-100",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-600",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left",
  "[&_th]:border [&_th]:border-zinc-200 [&_th]:bg-zinc-50 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold",
  "[&_td]:border [&_td]:border-zinc-200 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
  "[&_hr]:my-6 [&_hr]:border-zinc-200",
  "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-zinc-200",
  "[&_strong]:font-semibold [&_strong]:text-zinc-900",
].join(" ");
