"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAuthor } from "@/lib/admin/authors";

export function DeleteAuthorButton({ id, name, postCount }: { id: string; name: string; postCount: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      postCount > 0
        ? `"${name}" still has ${postCount} post${postCount === 1 ? "" : "s"}. Deleting will be refused until they are reassigned. Try anyway?`
        : `Delete "${name}"? This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      // On success the action redirects, so only the failure branch returns here.
      const res = await deleteAuthor(id);
      if (!res.ok) setError(res.message ?? "Could not delete the author.");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button intent="danger" size="sm" onClick={onClick} disabled={pending}>
        {pending ? "Deleting…" : "Delete author"}
      </Button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
