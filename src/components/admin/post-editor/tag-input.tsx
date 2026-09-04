"use client";
import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/field";

type Props = {
  id?: string;
  /** Hidden input name; the value is submitted as a JSON array. */
  name: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

/** Chip-style list input: Enter or comma adds, Backspace on an empty field removes the last tag. */
export function TagInput({ id, name, value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.replace(/,/g, " ").trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      {value.length ? (
        <ul className="mb-2 flex flex-wrap gap-1">
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="text-zinc-400 hover:text-zinc-800"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
