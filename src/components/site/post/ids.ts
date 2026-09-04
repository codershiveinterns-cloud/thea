/**
 * Ids of the page-owned landmarks on a post page (aria-labelledby targets).
 * They contain an underscore on purpose: body H2 ids come from slugify(), which only
 * ever emits [a-z0-9-], so a body heading such as "## FAQ" or "## Screenshots" can
 * never duplicate one of these (axe "duplicate-id-aria" / Lighthouse Accessibility).
 */
export const POST_IDS = {
  quickAnswer: "post_quick_answer",
  screenshots: "post_screenshots",
  faq: "post_faq",
  author: "post_author",
  related: "post_related",
} as const;
