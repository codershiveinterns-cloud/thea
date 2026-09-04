"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Notice } from "@/components/ui/card";
import type { ActionResult } from "@/lib/admin/types";

/**
 * Row actions report their result here so the message survives even when the row
 * itself leaves the current filter (e.g. "Mark used" while viewing only QUEUED).
 * Wraps the server-rendered table; only the notice is client state.
 */
type Feedback = { report: (result: ActionResult) => void };

const FeedbackContext = createContext<Feedback>({ report: () => {} });

export function useKeywordFeedback(): Feedback {
  return useContext(FeedbackContext);
}

export function KeywordFeedback({ children }: { children: ReactNode }) {
  const [last, setLast] = useState<ActionResult | null>(null);
  const value = useMemo<Feedback>(() => ({ report: setLast }), []);

  return (
    <FeedbackContext.Provider value={value}>
      {last?.message ? (
        <div className="mb-3">
          <Notice kind={last.ok ? "success" : "error"}>
            <div className="flex items-start justify-between gap-3">
              <span>{last.message}</span>
              <button
                type="button"
                onClick={() => setLast(null)}
                className="shrink-0 text-xs font-medium underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </Notice>
        </div>
      ) : null}
      {children}
    </FeedbackContext.Provider>
  );
}
