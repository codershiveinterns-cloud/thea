/**
 * Fixed identifiers shared by the admin, the public site, the sitemap and the pipeline.
 * Category slugs are part of public URLs — never rename them.
 */

export const SITE = {
  name: "FixDesk",
  tagline: "Same-day Windows update coverage and error-code fixes",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export const CATEGORIES = [
  {
    slug: "windows-updates",
    name: "Windows Updates",
    description:
      "What's new in each Windows 11 cumulative update and feature release: what changed, what to expect, and whether to install it.",
    example: "What's new in Windows 11 25H2",
  },
  {
    slug: "update-problems",
    name: "Update Problems",
    description:
      "Fixes for updates that won't install, get stuck, roll back, or break something after installing.",
    example: "Update not installing or stuck at 100%",
  },
  {
    slug: "error-codes",
    name: "Error Codes",
    description:
      "Step-by-step fixes for Windows error codes, from Windows Update failures to activation and store errors.",
    example: "How to fix 0x800f0922 in Windows 11",
  },
  {
    slug: "app-not-working",
    name: "Apps Not Working",
    description:
      "Third-party and Microsoft apps that stop opening, crash, or misbehave after a Windows update.",
    example: "Outlook not opening after Windows update",
  },
  {
    slug: "how-to",
    name: "How-To Guides",
    description:
      "Short guides to enable, disable, or configure new and changed Windows 11 features.",
    example: "How to disable a new feature in Windows 11",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const POST_STATUSES = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"] as const;
export const GENERATED_BY = ["AI", "HUMAN"] as const;
export const KEYWORD_SOURCES = ["FEED", "MANUAL"] as const;
export const KEYWORD_STATUSES = ["QUEUED", "USED", "SKIPPED"] as const;

/** Where ad HTML can be injected on a post page. Keys are used as Setting keys (AD_SLOT_<key>). */
export const AD_PLACEMENTS = [
  { key: "after-quick-answer", label: "After the quick answer box" },
  { key: "mid-article", label: "Mid-article (before the last method)" },
  { key: "end-of-article", label: "End of article (before FAQ)" },
] as const;
export type AdPlacementKey = (typeof AD_PLACEMENTS)[number]["key"];

export function adSlotSettingKey(placement: AdPlacementKey) {
  return `AD_SLOT_${placement}` as const;
}

/** All Setting keys with their defaults. Values are stored as strings. */
export const SETTING_KEYS = {
  POSTS_PER_DAY: "POSTS_PER_DAY",
  AUTO_PUBLISH: "AUTO_PUBLISH",
  SCHEDULER_ENABLED: "SCHEDULER_ENABLED",
  INDEXNOW_KEY: "INDEXNOW_KEY",
  GA_MEASUREMENT_ID: "GA_MEASUREMENT_ID",
  GSC_VERIFICATION: "GSC_VERIFICATION",
  AD_SLOT_AFTER_QUICK_ANSWER: "AD_SLOT_after-quick-answer",
  AD_SLOT_MID_ARTICLE: "AD_SLOT_mid-article",
  AD_SLOT_END_OF_ARTICLE: "AD_SLOT_end-of-article",
} as const;
export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  POSTS_PER_DAY: "2",
  AUTO_PUBLISH: "false",
  SCHEDULER_ENABLED: "true",
  INDEXNOW_KEY: "",
  GA_MEASUREMENT_ID: "",
  GSC_VERIFICATION: "",
  "AD_SLOT_after-quick-answer": "",
  "AD_SLOT_mid-article": "",
  "AD_SLOT_end-of-article": "",
};

export const POSTS_PER_DAY_MAX = 3;
export const RELATED_POSTS_MIN = 3;
export const RELATED_POSTS_MAX = 5;
export const FAQ_MIN = 3;
export const FAQ_MAX = 5;

export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const UPLOAD_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
