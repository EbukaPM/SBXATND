"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setEmploymentStatusAction } from "@/lib/actions/employees";
import { toast, toastError } from "@/hooks/use-toast";
import type { EmploymentStatus } from "@prisma/client";

const OPTIONS: EmploymentStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "EXITED"];

export function StatusButtons({
  employeeId,
  current,
  disabled,
}: {
  employeeId: string;
  current: EmploymentStatus;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function apply(status: EmploymentStatus) {
    startTransition(async () => {
      try {
        await setEmploymentStatusAction(employeeId, status);
        toast({ title: `Status changed to ${status}`, variant: "success" });
      } catch (err) {
        toastError(err, "Couldn't change status");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === current ? "default" : "outline"}
          disabled={disabled || pending || status === current}
          onClick={() => apply(status)}
        >
          {status}
        </Button>
      ))}
    </div>
  );
}
