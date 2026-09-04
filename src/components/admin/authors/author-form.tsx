"use client";
import { useActionState, useEffect, useState } from "react";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveAuthor, type AuthorFormState } from "@/lib/admin/authors";
import { CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import { AuthorAvatar } from "./author-avatar";

export type AuthorFormValues = {
  id?: string;
  name: string;
  slug: string;
  avatar: string | null;
  bio: string;
  categoryFocus: string[];
  stylePrompt: string;
};

/**
 * Same shape as imageRefSchema (src/lib/validation.ts) plus "something after the prefix", so a half-typed
 * value like "h", "avatars/me.png" or a bare "/" is never handed to <img src> and resolved against /admin/authors/.
 */
const PREVIEWABLE_RE = /^(\/|https?:\/\/)\S+$/;
/** How long the avatar field must be idle before the preview fetches it. */
const PREVIEW_DEBOUNCE_MS = 400;

function previewable(value: string): string | null {
  return PREVIEWABLE_RE.test(value) ? value : null;
}

/**
 * Create/edit form. All fields are controlled so React 19's post-action form reset
 * never wipes what the editor typed when validation fails.
 */
export function AuthorForm({ initial }: { initial?: AuthorFormValues }) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction, pending] = useActionState<AuthorFormState | null, FormData>(saveAuthor, null);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  // Existing slugs are public URLs — never auto-rewrite them. New authors follow the name until the slug is edited.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [avatar, setAvatar] = useState(initial?.avatar ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [focus, setFocus] = useState<string[]>(initial?.categoryFocus ?? []);
  const [stylePrompt, setStylePrompt] = useState(initial?.stylePrompt ?? "");

  // After a successful save, revalidatePath hands us the stored row (Zod trims name/slug/bio/stylePrompt);
  // adopt it so the inputs show exactly what is in the DB. Compared by content, not identity, so a
  // validation failure (no revalidate, same content) never clobbers in-progress edits.
  const initialKey = JSON.stringify(initial ?? null);
  const [syncedKey, setSyncedKey] = useState(initialKey);
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey);
    setName(initial?.name ?? "");
    setSlug(initial?.slug ?? "");
    setSlugTouched(isEdit);
    setAvatar(initial?.avatar ?? "");
    setBio(initial?.bio ?? "");
    setFocus(initial?.categoryFocus ?? []);
    setStylePrompt(initial?.stylePrompt ?? "");
  }

  // Live preview, but only for values that could be an image reference, and only once typing pauses —
  // a controlled <img src> would otherwise issue one GET per keystroke.
  const previewCandidate = previewable(avatar);
  const [settledPreview, setSettledPreview] = useState(previewCandidate);
  useEffect(() => {
    const t = window.setTimeout(() => setSettledPreview(previewCandidate), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [previewCandidate]);
  const previewSrc = previewCandidate !== null && settledPreview === previewCandidate ? previewCandidate : null;

  const errors: Record<string, string> = state && !state.ok ? (state.errors ?? {}) : {};

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function toggleFocus(slugValue: string, checked: boolean) {
    setFocus((prev) => (checked ? [...new Set([...prev, slugValue])] : prev.filter((s) => s !== slugValue)));
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state?.ok ? <Notice kind="success">{state.message ?? "Saved"}</Notice> : null}
      {state && !state.ok ? <Notice kind="error">{state.message ?? "Could not save."}</Notice> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" htmlFor="author-name" error={errors.name}>
          <Input
            id="author-name"
            name="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="author-slug"
          error={errors.slug}
          help={
            <>
              Public URL: /author/{slug || "…"} ·{" "}
              <button
                type="button"
                className="text-blue-700 hover:underline"
                onClick={() => {
                  setSlug(slugify(name));
                  setSlugTouched(true);
                }}
              >
                Regenerate from name
              </button>
            </>
          }
        >
          <Input
            id="author-slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </Field>
      </div>

      <Field
        label="Avatar"
        htmlFor="author-avatar"
        error={errors.avatar}
        help="Square image, at least 200×200. Upload one or paste a URL / site-relative path."
      >
        <div className="flex flex-wrap items-start gap-3">
          <AuthorAvatar name={name || "?"} avatar={previewSrc} size="md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              id="author-avatar"
              name="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="/uploads/avatars/… or https://…"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-2">
              <ImageUpload folder="avatars" label="Upload avatar" onUploaded={(url) => setAvatar(url)} />
              {avatar ? (
                <Button intent="ghost" size="sm" onClick={() => setAvatar("")}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Field>

      <Field
        label="Bio"
        htmlFor="author-bio"
        hint={`${bio.trim().length} / 1200`}
        error={errors.bio}
        help="Shown on the public author page and in the Person schema. Write it honestly — what this author actually does for the site. No fake credentials."
      >
        <Textarea
          id="author-bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          required
        />
      </Field>

      <Field
        label="Category focus"
        error={errors.categoryFocus}
        help="The pipeline only assigns this author posts from the checked categories."
      >
        <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const id = `focus-${c.slug}`;
            return (
              <label key={c.slug} htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
                <input
                  id={id}
                  type="checkbox"
                  name="categoryFocus"
                  value={c.slug}
                  checked={focus.includes(c.slug)}
                  onChange={(e) => toggleFocus(c.slug, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-zinc-500">{c.example}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Field>

      <Field
        label="Style prompt"
        htmlFor="author-style"
        hint={`${stylePrompt.trim().length} / 3000`}
        error={errors.stylePrompt}
        help="Injected verbatim into the AI system prompt for every post assigned to this author, after the post-structure rules. Describe voice, tone, sentence length, how to open, and what to avoid — not facts about Windows."
      >
        <Textarea
          id="author-style"
          name="stylePrompt"
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          rows={6}
          required
        />
      </Field>

      <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create author"}
        </Button>
        {!isEdit ? <p className="text-xs text-zinc-500">You can add an avatar and refine the style prompt after creating.</p> : null}
      </div>
    </form>
  );
}
