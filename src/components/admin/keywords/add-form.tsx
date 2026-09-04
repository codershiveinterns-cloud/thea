"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { addKeyword, addKeywordsBulk, type AddKeywordData, type BulkAddData } from "@/lib/admin/keywords";
import type { ActionResult } from "@/lib/admin/types";

export type CategoryOption = { id: string; name: string; slug: string };
type Mode = "single" | "bulk";

const KNOWN_FIELDS = new Set(["phrase", "phrases", "categoryId"]);

/** Errors the form has no field for (an unexpected server-side key) so they still surface. */
function unmappedErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors)
    .filter(([key]) => !KNOWN_FIELDS.has(key))
    .map(([, message]) => message);
}

/**
 * Add-to-queue form with a single-phrase mode and a paste-many mode.
 * Inputs are controlled so a validation error keeps what the editor typed;
 * they are cleared only after a successful add.
 */
export function KeywordAddForm({ categories }: { categories: CategoryOption[] }) {
  const [mode, setMode] = useState<Mode>("single");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1" role="group" aria-label="Add mode">
        {(
          [
            ["single", "One phrase"],
            ["bulk", "Paste a list"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            intent={mode === value ? "primary" : "ghost"}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === "single" ? (
        <SingleForm categories={categories} categoryId={categoryId} onCategoryChange={setCategoryId} />
      ) : (
        <BulkForm categories={categories} categoryId={categoryId} onCategoryChange={setCategoryId} />
      )}
    </div>
  );
}

type FormProps = {
  categories: CategoryOption[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
};

function CategorySelect({ id, categories, categoryId, onCategoryChange }: FormProps & { id: string }) {
  return (
    <Select id={id} name="categoryId" value={categoryId} onChange={(e) => onCategoryChange(e.target.value)} required>
      {categories.length === 0 ? <option value="">No categories</option> : null}
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}

function SingleForm({ categories, categoryId, onCategoryChange }: FormProps) {
  const [phrase, setPhrase] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult<AddKeywordData> | null, formData: FormData) => {
      const result = await addKeyword(prev, formData);
      if (result.ok) setPhrase("");
      return result;
    },
    null,
  );
  const errors = state && !state.ok ? (state.errors ?? {}) : {};
  const extra = unmappedErrors(errors);

  return (
    <div className="space-y-3">
      {/* Source is fixed to MANUAL server-side; no hidden field needed. */}
      <form action={formAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-start">
        <Field
          label="Phrase"
          htmlFor="kw-phrase"
          error={errors.phrase}
          help="Write it the way someone would type it into Google."
        >
          <Input
            id="kw-phrase"
            name="phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. Windows 11 update stuck at 100 percent"
            maxLength={160}
            autoComplete="off"
            required
          />
        </Field>
        <Field label="Category" htmlFor="kw-category" error={errors.categoryId}>
          <CategorySelect id="kw-category" categories={categories} categoryId={categoryId} onCategoryChange={onCategoryChange} />
        </Field>
        <div className="md:pt-6">
          <Button type="submit" disabled={pending || categories.length === 0} className="w-full md:w-auto">
            {pending ? "Adding…" : "Add to queue"}
          </Button>
        </div>
      </form>

      {state?.message ? (
        <Notice kind={state.ok ? "success" : "error"}>
          {state.message}
          {extra.length ? (
            <ul className="mt-1 list-disc pl-5">
              {extra.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
        </Notice>
      ) : null}
    </div>
  );
}

const LIST_PREVIEW = 10;

function SkippedList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, LIST_PREVIEW);
  const rest = items.length - shown.length;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium">{title}</p>
      <ul className="mt-0.5 list-disc pl-5 text-xs">
        {shown.map((item, i) => (
          <li key={`${i}-${item}`}>{item}</li>
        ))}
        {rest > 0 ? <li className="list-none pl-0 text-zinc-500">+{rest} more</li> : null}
      </ul>
    </div>
  );
}

function BulkForm({ categories, categoryId, onCategoryChange }: FormProps) {
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult<BulkAddData> | null, formData: FormData) => {
      const result = await addKeywordsBulk(prev, formData);
      if (result.ok && result.data && result.data.added > 0) setText("");
      return result;
    },
    null,
  );
  const errors = state && !state.ok ? (state.errors ?? {}) : {};
  const extra = unmappedErrors(errors);
  const lineCount = text.split(/\r?\n/).filter((line) => line.trim() !== "").length;

  let noticeKind: "success" | "warning" | "error" = "error";
  if (state?.ok) noticeKind = state.data && state.data.added > 0 ? "success" : "warning";

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        <Field
          label="Phrases"
          htmlFor="kw-phrases"
          hint="one per line"
          error={errors.phrases}
          help="Blank lines are ignored. Duplicates (case-insensitive) are skipped and listed afterwards."
        >
          <Textarea
            id="kw-phrases"
            name="phrases"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Windows 11 update stuck at 100 percent\nOutlook not opening after Windows update"}
            spellCheck={false}
          />
        </Field>
        <div className="flex flex-wrap items-start gap-3">
          <Field label="Category" htmlFor="kw-bulk-category" error={errors.categoryId} className="w-full md:w-56">
            <CategorySelect id="kw-bulk-category" categories={categories} categoryId={categoryId} onCategoryChange={onCategoryChange} />
          </Field>
          <div className="md:pt-6">
            <Button type="submit" disabled={pending || lineCount === 0 || categories.length === 0}>
              {pending ? "Adding…" : lineCount === 0 ? "Add to queue" : `Add ${lineCount} phrase${lineCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </form>

      {state?.message ? (
        <Notice kind={noticeKind}>
          {state.message}
          {extra.length ? (
            <ul className="mt-1 list-disc pl-5">
              {extra.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          {state.ok && state.data ? (
            <>
              <SkippedList title="Duplicates" items={state.data.duplicates} />
              <SkippedList title="Invalid (3–160 characters)" items={state.data.invalid} />
            </>
          ) : null}
        </Notice>
      ) : null}
    </div>
  );
}
