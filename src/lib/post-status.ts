/**
 * Editorial workflow. Single source of truth for which status buttons appear
 * in the editor and what each transition requires.
 *
 *   DRAFT ──send to review──▶ REVIEW ──approve──▶ APPROVED ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
 *     ▲                          │                   │                      │                     │
 *     └──────── back to draft ───┴───────────────────┴──────────────────────┴─────── restore ─────┘
 */
import type { PostStatus } from "@prisma/client";
import { RELATED_POSTS_MIN, FAQ_MIN } from "./constants";
import { structureFor, validateBodyStructure } from "./post-structure";
import { readFaq, readStringArray } from "./validation";

export type Transition = {
  to: PostStatus;
  label: string;
  /** Visual intent for the button */
  intent: "primary" | "secondary" | "danger";
  /** true → runs validateForPublish() first */
  requiresPublishCheck?: boolean;
};

export const TRANSITIONS: Record<PostStatus, Transition[]> = {
  DRAFT: [{ to: "REVIEW", label: "Send to review", intent: "primary" }],
  REVIEW: [
    { to: "APPROVED", label: "Approve", intent: "primary" },
    { to: "DRAFT", label: "Back to draft", intent: "secondary" },
  ],
  APPROVED: [
    { to: "PUBLISHED", label: "Publish", intent: "primary", requiresPublishCheck: true },
    { to: "REVIEW", label: "Back to review", intent: "secondary" },
  ],
  PUBLISHED: [
    { to: "ARCHIVED", label: "Unpublish (archive)", intent: "danger" },
    { to: "DRAFT", label: "Back to draft", intent: "secondary" },
  ],
  ARCHIVED: [
    { to: "PUBLISHED", label: "Re-publish", intent: "primary", requiresPublishCheck: true },
    { to: "DRAFT", label: "Back to draft", intent: "secondary" },
  ],
};

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return TRANSITIONS[from].some((t) => t.to === to);
}

export const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "In review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export type PublishCheck = { ok: boolean; errors: string[]; warnings: string[] };

/** Minimal shape needed to decide whether a post can go live. */
export type PublishablePost = {
  title: string;
  slug: string;
  quickAnswer: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  faq: unknown;
  screenshots: unknown;
  featuredImage: string | null;
  testedOnBuild: string | null;
  affectedBuilds: unknown;
  relatedPosts?: { id: string }[];
};

/**
 * Hard errors block publishing. Warnings are shown but don't block (CLAUDE.md allows
 * publishing with a generated featured image and adding screenshots/testedOnBuild later).
 */
export function validateForPublish(post: PublishablePost, categorySlug = "error-codes"): PublishCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (post.title.trim().length < 5) errors.push("Title is missing.");
  if (!post.slug) errors.push("Slug is missing.");
  if (post.quickAnswer.trim().length < 40) errors.push("Quick answer is missing or too short (aim for 2–3 sentences).");
  if (post.body.trim().length < 300) errors.push("Body is too thin (under ~300 characters).");
  for (const problem of validateBodyStructure(post.body, structureFor(categorySlug))) errors.push(`Structure: ${problem}`);
  if (!post.metaTitle.trim()) errors.push("Meta title is missing.");
  if (!post.metaDescription.trim()) errors.push("Meta description is missing.");
  if (readFaq(post.faq).length < FAQ_MIN) errors.push(`FAQ needs at least ${FAQ_MIN} questions.`);
  if (!post.featuredImage && readStringArray(post.screenshots).length === 0) {
    errors.push("Add a featured image or at least one screenshot before publishing.");
  }

  if (readStringArray(post.affectedBuilds).length === 0) warnings.push("No affected builds listed.");
  if (readStringArray(post.screenshots).length === 0) warnings.push("No screenshots uploaded yet — add real ones after verifying.");
  if (!post.testedOnBuild) warnings.push('"Tested on" build is empty — the post will show "Verified: pending".');
  if ((post.relatedPosts?.length ?? 0) < RELATED_POSTS_MIN) {
    warnings.push(`Fewer than ${RELATED_POSTS_MIN} related posts linked.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
