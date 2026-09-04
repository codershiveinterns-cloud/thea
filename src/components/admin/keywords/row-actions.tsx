"use client";
import type { KeywordStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteKeyword, setKeywordStatus } from "@/lib/admin/keywords";
import type { ActionResult } from "@/lib/admin/types";
import { useKeywordFeedback } from "./action-feedback";

/** Which status moves make sense from each current status. */
const MOVES: Record<KeywordStatus, { label: string; to: KeywordStatus }[]> = {
  QUEUED: [
    { label: "Mark used", to: "USED" },
    { label: "Skip", to: "SKIPPED" },
  ],
  USED: [
    { label: "Re-queue", to: "QUEUED" },
    { label: "Skip", to: "SKIPPED" },
  ],
  SKIPPED: [{ label: "Re-queue", to: "QUEUED" }],
};

type Props = { id: string; phrase: string; status: KeywordStatus };

export function KeywordRowActions({ id, phrase, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { report } = useKeywordFeedback();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      report(result);
      if (result.ok) router.refresh();
    });
  }

  function confirmDelete() {
    if (!window.confirm(`Delete "${phrase}" from the queue? This cannot be undone.`)) return;
    run(() => deleteKeyword(id));
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {MOVES[status].map((move) => (
        <Button
          key={move.to}
          intent="secondary"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setKeywordStatus(id, move.to))}
        >
          {move.label}
        </Button>
      ))}
      <Button intent="danger" size="sm" disabled={pending} onClick={confirmDelete}>
        Delete
      </Button>
    </div>
  );
}
