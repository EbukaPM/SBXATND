"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reviewDeletionRequestAction } from "@/lib/actions/employees";
import { toast, toastError } from "@/hooks/use-toast";

export function ReviewDeletionForm({ requestId }: { requestId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function review(decision: "APPROVE" | "REJECT") {
    const formData = new FormData();
    formData.set("decision", decision);
    formData.set("note", note);
    startTransition(async () => {
      try {
        await reviewDeletionRequestAction(requestId, formData);
        toast({
          title: decision === "APPROVE" ? "Deletion approved" : "Request rejected",
          variant: decision === "APPROVE" ? "destructive" : "success",
        });
      } catch (err) {
        toastError(err, "Couldn't review request");
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
