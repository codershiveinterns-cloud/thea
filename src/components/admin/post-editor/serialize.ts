/**
 * Client-safe shape of a Post for the editor. Pure module (no "use server"/"use client")
 * so both the admin pages (server) and the editor (client, type-only) can import it.
 *
 * Lives here rather than in src/lib/admin/posts.ts because a "use server" module may
 * only export async functions, and this is a synchronous transform.
 */
import type { GeneratedBy, Post, PostStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { readFaq, readStringArray, type FaqItem } from "@/lib/validation";

export type SerializedPost = {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  authorId: string;
  status: PostStatus;
  quickAnswer: string;
  body: string;
  affectedBuilds: string[];
  faq: FaqItem[];
  metaTitle: string;
  metaDescription: string;
  featuredImage: string | null;
  screenshots: string[];
  sourceUrls: string[];
  qualityScore: number | null;
  qualityNotes: string | null;
  generatedBy: GeneratedBy;
  testedOnBuild: string | null;
  /** ISO strings (or null) — Dates are not JSON-safe across the server/client boundary */
  lastVerifiedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Display strings formatted on the server. The editor is a client component that is also
   * server-rendered; formatting Intl dates in both places with different timezones would
   * produce a hydration mismatch, so the labels travel pre-formatted.
   */
  createdAtLabel: string;
  updatedAtLabel: string;
  publishedAtLabel: string;
  relatedPostIds: string[];
};

export type CandidatePost = {
  id: string;
  title: string;
  categoryId: string;
  status: PostStatus;
  slug: string;
};

export type CategoryOption = { id: string; name: string; slug: string };
export type AuthorOption = { id: string; name: string; slug: string };

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

export function serializePost(post: Post & { relatedPosts: { id: string }[] }): SerializedPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    categoryId: post.categoryId,
    authorId: post.authorId,
    status: post.status,
    quickAnswer: post.quickAnswer,
    body: post.body,
    affectedBuilds: readStringArray(post.affectedBuilds),
    faq: readFaq(post.faq),
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    featuredImage: post.featuredImage,
    screenshots: readStringArray(post.screenshots),
    sourceUrls: readStringArray(post.sourceUrls),
    qualityScore: post.qualityScore,
    qualityNotes: post.qualityNotes,
    generatedBy: post.generatedBy,
    testedOnBuild: post.testedOnBuild,
    lastVerifiedAt: iso(post.lastVerifiedAt),
    publishedAt: iso(post.publishedAt),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    createdAtLabel: formatDateTime(post.createdAt),
    updatedAtLabel: formatDateTime(post.updatedAt),
    publishedAtLabel: formatDateTime(post.publishedAt),
    relatedPostIds: post.relatedPosts.map((r) => r.id),
  };
}
