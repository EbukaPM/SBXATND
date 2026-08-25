"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestDeleteEmployeeAction } from "@/lib/actions/employees";
import { toast, toastError } from "@/hooks/use-toast";

export function DeleteEmployeeForm({ employeeId, isSuperAdmin }: { employeeId: string; isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
        {isSuperAdmin ? "Delete employee" : "Request deletion"}
      </Button>
    );
  }

  function submit() {
    const formData = new FormData();
    formData.set("reason", reason);
    startTransition(async () => {
      try {
        await requestDeleteEmployeeAction(employeeId, formData);
        setOpen(false);
        toast({
          title: isSuperAdmin ? "Employee deleted" : "Deletion request submitted",
          description: isSuperAdmin ? undefined : "A Super Admin will review it.",
          variant: isSuperAdmin ? "destructive" : "success",
        });
      } catch (err) {
        toastError(err, "Couldn't submit");
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {isSuperAdmin
          ? "This immediately hides the employee everywhere and blocks clock-in. Their attendance history is kept."
          : "This will be sent to a Super Admin for approval — the employee stays fully active until then."}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason for deletion (required)"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || reason.trim().length < 3}
          onClick={submit}
        >
          {isSuperAdmin ? "Confirm delete" : "Submit request"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
