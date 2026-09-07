/**
 * Zod schemas for every external input (admin forms, feed items, AI output).
 * Nothing reaches the database without passing through one of these.
 */
import { z } from "zod";
import {
  CATEGORY_SLUGS,
  FAQ_MAX,
  GENERATED_BY,
  KEYWORD_SOURCES,
  KEYWORD_STATUSES,
  POST_STATUSES,
  POSTS_PER_DAY_MAX,
  RELATED_POSTS_MAX,
} from "./constants";
import { SLUG_RE } from "./slug";

// ---------- primitives ----------

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short")
  .max(90, "Slug is too long")
  .regex(SLUG_RE, "Use lowercase letters, numbers and hyphens only");

export const stringArraySchema = z.array(z.string().trim().min(1)).default([]);

export const urlSchema = z.string().trim().url("Must be a full URL starting with http(s)://");

/** Accepts either an absolute URL or a site-relative path like /uploads/x.png */
export const imageRefSchema = z
  .string()
  .trim()
  .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Must be a URL or a /path");

export const faqItemSchema = z.object({
  question: z.string().trim().min(5, "Question is too short").max(200),
  answer: z.string().trim().min(10, "Answer is too short").max(1500),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqSchema = z.array(faqItemSchema).max(FAQ_MAX, `At most ${FAQ_MAX} FAQ items`).default([]);

export const postStatusSchema = z.enum(POST_STATUSES);
export const generatedBySchema = z.enum(GENERATED_BY);
export const keywordSourceSchema = z.enum(KEYWORD_SOURCES);
export const keywordStatusSchema = z.enum(KEYWORD_STATUSES);
export const categorySlugSchema = z.enum(CATEGORY_SLUGS as [string, ...string[]]);

// ---------- Post ----------

export const postInputSchema = z.object({
  title: z.string().trim().min(5, "Title is too short").max(120, "Title is too long (max 120)"),
  slug: slugSchema,
  categoryId: z.string().min(1, "Pick a category"),
  authorId: z.string().min(1, "Pick an author"),
  quickAnswer: z.string().trim().max(600, "Quick answer should be 2–3 sentences").default(""),
  body: z.string().default(""),
  affectedBuilds: stringArraySchema,
  faq: faqSchema,
  metaTitle: z.string().trim().max(70, "Meta title should be ≤ 70 characters").default(""),
  metaDescription: z.string().trim().max(170, "Meta description should be ≤ 170 characters").default(""),
  featuredImage: imageRefSchema.nullable().default(null),
  screenshots: z.array(imageRefSchema).default([]),
  sourceUrls: z.array(urlSchema).default([]),
  generatedBy: generatedBySchema.default("HUMAN"),
  testedOnBuild: z.string().trim().max(60).nullable().default(null),
  lastVerifiedAt: z.coerce.date().nullable().default(null),
  relatedPostIds: z.array(z.string().min(1)).max(RELATED_POSTS_MAX, `At most ${RELATED_POSTS_MAX} related posts`).default([]),
});
export type PostInput = z.infer<typeof postInputSchema>;

// ---------- Author ----------

export const authorInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  avatar: imageRefSchema.nullable().default(null),
  bio: z.string().trim().min(20, "Bio should be at least a sentence or two").max(1200),
  categoryFocus: z.array(categorySlugSchema).min(1, "Pick at least one category"),
  stylePrompt: z.string().trim().min(20, "Style prompt should describe the voice in a few sentences").max(3000),
});
export type AuthorInput = z.infer<typeof authorInputSchema>;

// ---------- Keyword ----------

export const keywordInputSchema = z.object({
  phrase: z.string().trim().min(3).max(160),
  categoryId: z.string().min(1, "Pick a category"),
  source: keywordSourceSchema.default("MANUAL"),
});
export type KeywordInput = z.infer<typeof keywordInputSchema>;

// ---------- Settings ----------

export const settingsInputSchema = z.object({
  POSTS_PER_DAY: z.coerce.number().int().min(1).max(POSTS_PER_DAY_MAX).default(2),
  AUTO_PUBLISH: z.boolean().default(false),
  SCHEDULER_ENABLED: z.boolean().default(true),
  INDEXNOW_KEY: z.string().trim().max(128).default(""),
  GA_MEASUREMENT_ID: z.string().trim().max(40).default(""),
  GSC_VERIFICATION: z.string().trim().max(200).default(""),
  FEED_URLS: z
    .string()
    .max(4000)
    .default("")
    .refine((v) => v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).every((l) => /^https?:\/\/\S+$/.test(l)), "One feed URL per line, each starting with http(s)://"),
  "AD_SLOT_after-quick-answer": z.string().max(20000).default(""),
  "AD_SLOT_mid-article": z.string().max(20000).default(""),
  "AD_SLOT_end-of-article": z.string().max(20000).default(""),
});
export type SettingsInput = z.infer<typeof settingsInputSchema>;

// ---------- JSON column readers (never trust stored JSON blindly) ----------

export function readStringArray(value: unknown): string[] {
  const r = z.array(z.string()).safeParse(value);
  return r.success ? r.data : [];
}

export function readFaq(value: unknown): FaqItem[] {
  const r = z.array(faqItemSchema).safeParse(value);
  return r.success ? r.data : [];
}

/** Flatten a ZodError into { field: message } for form display. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
