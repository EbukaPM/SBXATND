"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setEmploymentStatusAction } from "@/lib/actions/employees";
import type { EmploymentStatus } from "@prisma/client";

const OPTIONS: EmploymentStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "EXITED"];

export function StatusButtons({ employeeId, current }: { employeeId: string; current: EmploymentStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === current ? "default" : "outline"}
          disabled={pending || status === current}
          onClick={() => startTransition(() => setEmploymentStatusAction(employeeId, status))}
        >
          {status}
        </Button>
      ))}
    </div>
  );
}
