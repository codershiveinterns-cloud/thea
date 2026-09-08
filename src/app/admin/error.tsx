"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";

/** Admin error boundary: shows the message (admin is trusted) and a retry. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] render error", error.digest ?? "", error.message);
  }, [error]);
  return (
    <div className="space-y-4">
      <Notice kind="error">
        <p className="font-medium">This admin page failed to render.</p>
        <p className="mt-1 break-words text-xs">
          {error.message}
          {error.digest ? ` (ref ${error.digest})` : ""}
        </p>
      </Notice>
      <Button intent="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
