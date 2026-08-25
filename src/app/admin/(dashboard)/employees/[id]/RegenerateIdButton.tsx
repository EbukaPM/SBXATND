"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { regenerateAttendanceIdAction } from "@/lib/actions/employees";
import { toast, toastError } from "@/hooks/use-toast";

export function RegenerateIdButton({ employeeId, disabled }: { employeeId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [newId, setNewId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (newId) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
        <p className="font-medium text-green-800">New Attendance ID (shown once):</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-widest">{newId}</p>
        <p className="mt-1 text-xs text-green-800">The previous ID is now invalid.</p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Old ID becomes invalid immediately. Continue?</span>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const r = await regenerateAttendanceIdAction(employeeId);
                setNewId(r.attendanceId);
                setConfirming(false);
                toast({ title: "Attendance ID regenerated", variant: "success" });
              } catch (err) {
                toastError(err, "Couldn't regenerate ID");
              }
            })
          }
        >
          Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={disabled} onClick={() => setConfirming(true)}>
      Regenerate Attendance ID
    </Button>
  );
}
