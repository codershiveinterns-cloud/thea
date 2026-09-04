import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AdSlot } from "@/components/site/ad-slot";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { bodyHeadings, PostBody } from "@/components/site/markdown";
import { AffectedBuilds } from "@/components/site/post/affected-builds";
import { AuthorCard } from "@/components/site/post/author-card";
import { Faq } from "@/components/site/post/faq";
import { PostMeta } from "@/components/site/post/post-meta";
import { QuickAnswer } from "@/components/site/post/quick-answer";
import { RelatedPosts } from "@/components/site/post/related-posts";
import { Screenshots } from "@/components/site/post/screenshots";
import { Toc } from "@/components/site/post/toc";
import { VerificationLine } from "@/components/site/post/verification-line";
import { RELATED_POSTS_MAX, RELATED_POSTS_MIN, SITE } from "@/lib/constants";
import { allPublishedForIndex, getPublishedPost, listPublishedPosts, type PostCard } from "@/lib/posts";
import { readingTimeMinutes, wordCount } from "@/lib/post-utils";
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
  categoryPath,
  faqJsonLd,
  featuredImageFor,
  jsonLdGraph,
  organizationJsonLd,
  personJsonLd,
  postPath,
} from "@/lib/seo";
import { readFaq, readStringArray } from "@/lib/validation";

/**
 * /[category]/[slug] — the post page. Fully server-rendered, ISR every hour,
 * pre-built for every published post. Only PUBLISHED posts resolve; anything
 * else (unknown category, draft, junk like /favicon.png) is a 404.
 */
export const revalidate = 3600;

type Params = { category: string; slug: string };
type Props = { params: Promise<Params> };
type PublishedPost = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

/** Deduped between generateMetadata and the page render within one request. */
const loadPost = cache((category: string, slug: string) => getPublishedPost(category, slug));

export async function generateStaticParams(): Promise<Params[]> {
  const posts = await allPublishedForIndex();
  return posts.map((p) => ({ category: p.category.slug, slug: p.slug }));
}

/** Meta/JSON-LD description: editor value, else the quick answer, else an honest generic line. */
function descriptionFor(post: PublishedPost): string {
  return post.metaDescription || post.quickAnswer || `${post.title} — ${SITE.tagline}.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const post = await loadPost(category, slug);
  if (!post) notFound();
  const meta = buildMetadata({
    title: post.metaTitle || post.title,
    description: descriptionFor(post),
    path: postPath(post.category.slug, post.slug),
    image: featuredImageFor(post),
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: [post.author.name],
  });
  // Next replaces the root layout's `alternates` with the page's (no deep merge), which would
  // drop the RSS autodiscovery link on every post URL. Re-declare it next to the canonical.
  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      types: { "application/rss+xml": [{ url: absoluteUrl("/feed.xml"), title: `${SITE.name} RSS feed` }] },
    },
  };
}

/**
 * Editor-confirmed related posts first; when there are fewer than RELATED_POSTS_MIN,
 * top up with the latest published posts from the same category (no self, no duplicates).
 */
async function relatedFor(post: PublishedPost): Promise<PostCard[]> {
  const related: PostCard[] = post.relatedPosts.slice(0, RELATED_POSTS_MAX);
  if (related.length >= RELATED_POSTS_MIN) return related;

  const seen = new Set<string>([post.id, ...related.map((p) => p.id)]);
  const { items } = await listPublishedPosts({ categorySlug: post.category.slug, take: 6 });
  for (const item of items) {
    if (related.length >= RELATED_POSTS_MAX) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    related.push(item);
  }
  return related;
}

export default async function PostPage({ params }: Props) {
  const { category, slug } = await params;
  const post = await loadPost(category, slug);
  if (!post) notFound();

  const path = postPath(post.category.slug, post.slug);
  const builds = readStringArray(post.affectedBuilds);
  const screenshots = readStringArray(post.screenshots);
  const faq = readFaq(post.faq);
  const headings = bodyHeadings(post.body);
  const related = await relatedFor(post);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: post.category.name, path: categoryPath(post.category.slug) },
    { name: post.title, path },
  ];

  const jsonLd = jsonLdGraph(
    organizationJsonLd(),
    articleJsonLd({
      title: post.title,
      description: descriptionFor(post),
      path,
      image: absoluteUrl(featuredImageFor(post)),
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      author: { name: post.author.name, slug: post.author.slug },
      categoryName: post.category.name,
      wordCount: wordCount(post.body),
    }),
    faqJsonLd(faq),
    breadcrumbJsonLd(crumbs),
    personJsonLd({
      name: post.author.name,
      slug: post.author.slug,
      bio: post.author.bio,
      avatar: post.author.avatar,
      categoryFocus: readStringArray(post.author.categoryFocus),
    }),
  );

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <JsonLd data={jsonLd} />

      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-4xl">{post.title}</h1>
      <PostMeta author={post.author} publishedAt={post.publishedAt} updatedAt={post.updatedAt} readingMinutes={readingTimeMinutes(post.body)} />
      <AffectedBuilds builds={builds} />

      <QuickAnswer text={post.quickAnswer} />
      <AdSlot placement="after-quick-answer" />
      <Toc headings={headings} />

      <div className="mt-8">
        <PostBody body={post.body} />
      </div>

      <Screenshots images={screenshots} title={post.title} />
      <AdSlot placement="end-of-article" />
      <Faq items={faq} />

      <VerificationLine testedOnBuild={post.testedOnBuild} lastVerifiedAt={post.lastVerifiedAt} authorName={post.author.name} />
      <AuthorCard author={post.author} />
      <RelatedPosts posts={related} />
    </article>
  );
}
