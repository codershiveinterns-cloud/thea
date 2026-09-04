"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PostStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { deletePost, savePost, transitionPost } from "@/lib/admin/posts";
import type { ActionResult } from "@/lib/admin/types";
import { TRANSITIONS, type PublishCheck, type Transition } from "@/lib/post-status";
import { slugify } from "@/lib/slug";
import type { FaqItem } from "@/lib/validation";
import { BodyEditor } from "./body-editor";
import { FaqEditor } from "./faq-editor";
import { PostPreview } from "./post-preview";
import { PostSidebar, type EditorUpdate, type SidebarValues } from "./post-sidebar";
import { RelatedPostsPicker } from "./related-posts-picker";
import type { AuthorOption, CandidatePost, CategoryOption, SerializedPost } from "./serialize";

export type PostEditorProps = {
  post: SerializedPost | null;
  categories: CategoryOption[];
  authors: AuthorOption[];
  candidatePosts: CandidatePost[];
  suggestedRelated: CandidatePost[];
  publishCheck: PublishCheck | null;
  /** One-off message from the page (e.g. after ?saved=1) */
  flash?: { kind: "success" | "error"; text: string } | null;
};

type EditorValues = SidebarValues & {
  title: string;
  slug: string;
  quickAnswer: string;
  body: string;
  faq: FaqItem[];
  relatedPostIds: string[];
};

const QUICK_ANSWER_MAX = 600;

/**
 * yyyy-mm-dd for the date input, read from the ISO string's UTC date part.
 * The server coerces the date input as UTC midnight (z.coerce.date), so reading the UTC calendar
 * date keeps the round trip stable in every timezone and identical on server and client (no hydration drift).
 */
function isoDatePart(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function initialValues(post: SerializedPost | null, categories: CategoryOption[], authors: AuthorOption[]): EditorValues {
  if (!post) {
    return {
      title: "",
      slug: "",
      quickAnswer: "",
      body: "",
      faq: [],
      relatedPostIds: [],
      categoryId: categories[0]?.id ?? "",
      authorId: authors[0]?.id ?? "",
      generatedBy: "HUMAN",
      affectedBuilds: [],
      testedOnBuild: "",
      lastVerifiedAt: "",
      metaTitle: "",
      metaDescription: "",
      featuredImage: "",
      screenshots: [],
      sourceUrls: "",
    };
  }
  return {
    title: post.title,
    slug: post.slug,
    quickAnswer: post.quickAnswer,
    body: post.body,
    faq: post.faq,
    relatedPostIds: post.relatedPostIds,
    categoryId: post.categoryId,
    authorId: post.authorId,
    generatedBy: post.generatedBy,
    affectedBuilds: post.affectedBuilds,
    testedOnBuild: post.testedOnBuild ?? "",
    lastVerifiedAt: isoDatePart(post.lastVerifiedAt),
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    featuredImage: post.featuredImage ?? "",
    screenshots: post.screenshots,
    sourceUrls: post.sourceUrls.join("\n"),
  };
}

function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function PostEditor({ post, categories, authors, candidatePosts, suggestedRelated, publishCheck, flash = null }: PostEditorProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<EditorValues>(() => initialValues(post, categories, authors));
  const [slugTouched, setSlugTouched] = useState(post !== null);
  const [saveState, saveAction, savePending] = useActionState<ActionResult | null, FormData>(savePost, null);
  const [transitionResult, setTransitionResult] = useState<ActionResult | null>(null);
  const [transitionPending, startTransition] = useTransition();
  const [activeTransition, setActiveTransition] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(Boolean(flash));
  // React 19 resets the form after every <form action> / formAction completes. Inputs and textareas are
  // re-synced from React state, but controlled <select>s snap back to their first option (React never sets
  // defaultSelected). Bumping this epoch once an action settles remounts the selects with the right value.
  const [selectEpoch, setSelectEpoch] = useState(0);
  useEffect(() => {
    if (savePending || transitionPending) return;
    setSelectEpoch((n) => n + 1);
  }, [saveState, transitionResult, savePending, transitionPending]);

  const update = useCallback(
    (patch: EditorUpdate<EditorValues>) => setValues((v) => ({ ...v, ...(typeof patch === "function" ? patch(v) : patch) })),
    [],
  );

  // Publishing fills lastVerifiedAt server-side when it was empty. Pull that into the form once
  // the refreshed post arrives so the next Save does not write null back over it.
  const serverVerifiedAt = post?.lastVerifiedAt ?? null;
  useEffect(() => {
    if (!serverVerifiedAt) return;
    setValues((v) => (v.lastVerifiedAt ? v : { ...v, lastVerifiedAt: isoDatePart(serverVerifiedAt) }));
  }, [serverVerifiedAt]);

  // One-off ?saved=1 / ?deleteFailed=1 flags: drop them from the URL so a reload doesn't repeat the notice.
  const hasFlash = Boolean(flash);
  useEffect(() => {
    if (hasFlash && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [hasFlash]);

  // Cmd/Ctrl+S saves (uses the form's own action, never a status button).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pending = savePending || transitionPending;
  const result = pending ? null : (transitionResult ?? saveState);
  const errors: Record<string, string> = result && !result.ok && result.errors ? result.errors : {};

  function runTransition(t: Transition, formData: FormData) {
    if (!post) return;
    setActiveTransition(t.to);
    startTransition(async () => {
      const res = await transitionPost(post.id, t.to, formData);
      setTransitionResult(res);
      setActiveTransition(null);
      if (res.ok) router.refresh();
    });
  }

  function onTitleChange(title: string) {
    update(slugTouched ? { title } : { title, slug: slugify(title) });
  }

  const categorySlug = categories.find((c) => c.id === values.categoryId)?.slug ?? "category";
  const categoryName = categories.find((c) => c.id === values.categoryId)?.name ?? "";
  // "View live" must point at the saved post, not at an unsaved category change in the form.
  const liveHref = post ? `/${categories.find((c) => c.id === post.categoryId)?.slug ?? categorySlug}/${post.slug}` : null;
  const authorName = authors.find((a) => a.id === values.authorId)?.name ?? "";
  const transitions = post ? TRANSITIONS[post.status] : [];

  const preview = (
    <PostPreview
      title={values.title}
      quickAnswer={values.quickAnswer}
      affectedBuilds={values.affectedBuilds}
      body={values.body}
      faq={values.faq}
      testedOnBuild={values.testedOnBuild}
      lastVerifiedAt={values.lastVerifiedAt}
      authorName={authorName}
      categoryName={categoryName}
      featuredImage={values.featuredImage}
    />
  );

  return (
    <>
      <form
        ref={formRef}
        action={saveAction}
        onSubmit={() => {
          setTransitionResult(null);
          setShowFlash(false);
        }}
        className="space-y-4"
      >
        {post ? <input type="hidden" name="id" value={post.id} /> : null}

        {/* Top bar: title, status, actions */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Link href="/admin/posts" className="hover:text-zinc-900">
                Posts
              </Link>
              <span aria-hidden>/</span>
              <span className="text-zinc-800">{post ? "Edit post" : "New post"}</span>
            </p>
            <div className="flex items-center gap-2">
              {post ? <PostStatusBadge status={post.status} /> : <span className="text-xs text-zinc-500">Not saved yet</span>}
              {post?.status === "PUBLISHED" && liveHref ? (
                <a href={liveHref} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  View live ↗
                </a>
              ) : null}
            </div>
          </div>

          <label htmlFor="post-title" className="sr-only">
            Title
          </label>
          <input
            id="post-title"
            name="title"
            value={values.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Title — the target keyword phrased naturally (this is the H1)"
            maxLength={120}
            autoComplete="off"
            aria-invalid={errors.title ? true : undefined}
            className="mt-2 block w-full rounded-md border border-transparent px-2 py-1.5 text-xl font-semibold tracking-tight text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 hover:border-zinc-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          {errors.title ? (
            <p className="mt-1 px-2 text-xs text-red-600" role="alert">
              {errors.title}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Save must be the first submit button so Enter in a text field saves instead of changing status. */}
            <Button type="submit" intent="primary" disabled={pending}>
              {savePending ? "Saving…" : post ? "Save" : "Save draft"}
            </Button>
            {post ? (
              transitions.map((t) => (
                <Button
                  key={t.to}
                  type="submit"
                  intent={t.intent}
                  disabled={pending}
                  formAction={(fd: FormData) => runTransition(t, fd)}
                  title={t.requiresPublishCheck ? "Saves, then runs the publish check" : "Saves, then changes the status"}
                >
                  {transitionPending && activeTransition === t.to ? "Working…" : t.label}
                </Button>
              ))
            ) : (
              <span className="text-xs text-zinc-500">Save the draft first to enable status changes.</span>
            )}
            <span className="flex-1" />
            <span className="hidden text-xs text-zinc-400 sm:inline">⌘S / Ctrl+S saves</span>
            {post ? (
              <Button type="submit" intent="danger" form="delete-post-form" disabled={pending}>
                Delete
              </Button>
            ) : null}
          </div>

          {showFlash && flash ? (
            <div className="mt-3">
              <Notice kind={flash.kind}>{flash.text}</Notice>
            </div>
          ) : null}
          {result && (result.message || (!result.ok && result.errors)) ? (
            <div className="mt-3">
              <Notice kind={result.ok ? "success" : "error"}>
                {result.message}
                {!result.ok && result.errors && Object.keys(result.errors).length ? (
                  <ul className="mt-1 list-disc pl-5">
                    {Object.entries(result.errors).map(([field, msg]) => (
                      <li key={field}>
                        <span className="font-medium">{field === "_form" ? "Form" : field}</span>: {msg}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Notice>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Main column */}
          <div className="min-w-0 space-y-4">
            <Card title="Basics">
              <div className="space-y-3">
                <Field
                  label="Slug"
                  htmlFor="post-slug"
                  error={errors.slug}
                  hint={
                    slugTouched && values.title ? (
                      <button
                        type="button"
                        onClick={() => {
                          update({ slug: slugify(values.title) });
                          setSlugTouched(false);
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        reset from title
                      </button>
                    ) : (
                      "auto from title"
                    )
                  }
                  help={
                    <span className="font-mono">
                      /{categorySlug}/{values.slug || "…"}
                    </span>
                  }
                >
                  <Input
                    id="post-slug"
                    name="slug"
                    value={values.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update({ slug: e.target.value });
                    }}
                    placeholder="lowercase-words-and-hyphens"
                    className="font-mono text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>

                <Field
                  label="Quick answer"
                  htmlFor="post-quick-answer"
                  hint={
                    <span className={values.quickAnswer.length > QUICK_ANSWER_MAX ? "font-medium text-red-600" : undefined}>
                      {sentenceCount(values.quickAnswer)} sentences · {values.quickAnswer.length}/{QUICK_ANSWER_MAX}
                    </span>
                  }
                  error={errors.quickAnswer}
                  help="Two or three sentences that answer the title outright. Shown in a box under the H1."
                >
                  <Textarea
                    id="post-quick-answer"
                    name="quickAnswer"
                    value={values.quickAnswer}
                    onChange={(e) => update({ quickAnswer: e.target.value })}
                    className="min-h-20"
                    placeholder="Start with the fix that works most often, then the fallback."
                  />
                </Field>
              </div>
            </Card>

            <Card title="Body">
              <BodyEditor value={values.body} onChange={(body) => update({ body })} postId={post?.id ?? null} preview={preview} error={errors.body} />
            </Card>

            <Card title="FAQ">
              <FaqEditor value={values.faq} onChange={(faq) => update({ faq })} error={errors.faq} />
            </Card>

            <Card title="Related posts">
              <RelatedPostsPicker
                value={values.relatedPostIds}
                onChange={(relatedPostIds) => update({ relatedPostIds })}
                candidates={candidatePosts}
                suggested={suggestedRelated}
                categories={categories}
                error={errors.relatedPostIds}
              />
            </Card>
          </div>

          <PostSidebar values={values} update={update} categories={categories} authors={authors} errors={errors} post={post} publishCheck={publishCheck} selectEpoch={selectEpoch} />
        </div>
      </form>

      {post ? (
        <form
          id="delete-post-form"
          action={deletePost.bind(null, post.id)}
          onSubmit={(e) => {
            if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) e.preventDefault();
          }}
        />
      ) : null}
    </>
  );
}
