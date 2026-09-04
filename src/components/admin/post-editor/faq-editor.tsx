"use client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { FAQ_MAX, FAQ_MIN } from "@/lib/constants";
import type { FaqItem } from "@/lib/validation";

type Props = {
  value: FaqItem[];
  onChange: (next: FaqItem[]) => void;
  error?: string;
};

/** Ordered list of Q&A rows. Submitted as a JSON array in the hidden `faq` input. */
export function FaqEditor({ value, onChange, error }: Props) {
  const update = (i: number, patch: Partial<FaqItem>) => onChange(value.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    if (value.length >= FAQ_MAX) return;
    onChange([...value, { question: "", answer: "" }]);
  };

  const countTone = value.length < FAQ_MIN || value.length > FAQ_MAX ? "text-amber-700" : "text-zinc-500";

  return (
    <div>
      <input type="hidden" name="faq" value={JSON.stringify(value)} />
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-xs ${countTone}`}>
          {value.length} of {FAQ_MIN}–{FAQ_MAX} questions
        </p>
        <Button size="sm" intent="secondary" onClick={add} disabled={value.length >= FAQ_MAX}>
          Add question
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500">
          No FAQ yet. Add {FAQ_MIN}–{FAQ_MAX} questions readers actually search for; they are emitted as FAQPage schema.
        </p>
      ) : (
        <ol className="space-y-3">
          {value.map((item, i) => (
            <li key={i} className="rounded-md border border-zinc-200 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-xs font-medium text-zinc-500">{i + 1}.</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={item.question}
                    onChange={(e) => update(i, { question: e.target.value })}
                    placeholder="Question (5–200 characters)"
                    aria-label={`FAQ ${i + 1} question`}
                    maxLength={200}
                  />
                  <Textarea
                    value={item.answer}
                    onChange={(e) => update(i, { answer: e.target.value })}
                    placeholder="Answer (10–1500 characters)"
                    aria-label={`FAQ ${i + 1} answer`}
                    className="min-h-20"
                    maxLength={1500}
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="sm" intent="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    ↑
                  </Button>
                  <Button size="sm" intent="ghost" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move down">
                    ↓
                  </Button>
                  <Button size="sm" intent="ghost" onClick={() => remove(i)} aria-label="Remove question" className="text-red-600 hover:bg-red-50">
                    ×
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
