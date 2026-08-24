"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reviewDeletionRequestAction } from "@/lib/actions/employees";

export function ReviewDeletionForm({ requestId }: { requestId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function review(decision: "APPROVE" | "REJECT") {
    setError(null);
    const formData = new FormData();
    formData.set("decision", decision);
    formData.set("note", note);
    startTransition(async () => {
      try {
        await reviewDeletionRequestAction(requestId, formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-64">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => review("APPROVE")} className="flex-1">
          Approve delete
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => review("REJECT")} className="flex-1">
          Reject
        </Button>
      </div>
    </div>
  );
}
