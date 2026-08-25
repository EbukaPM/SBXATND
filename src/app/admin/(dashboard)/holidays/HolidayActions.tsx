"use client";

import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createHolidayAction, deleteHolidayAction } from "@/lib/actions/holidays";
import { toast, toastError } from "@/hooks/use-toast";

export function CreateHolidayForm() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await createHolidayAction(formData);
        toast({ title: "Holiday added", variant: "success" });
        formRef.current?.reset();
      } catch (err) {
        toastError(err, "Couldn't add holiday");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-wrap items-end gap-2">
      <div className="w-full sm:w-56">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
        <Input name="name" required className="h-9 w-full" placeholder="Independence Day" />
      </div>
      <div className="w-full sm:w-40">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
        <Input type="date" name="date" required className="h-9 w-full" />
      </div>
      <div className="w-full sm:w-64">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
        <Input name="description" className="h-9 w-full" />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}

export function DeleteHolidayButton({ holidayId, className }: { holidayId: string; className?: string }) {
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await deleteHolidayAction(holidayId);
        toast({ title: "Holiday deleted", variant: "success" });
      } catch (err) {
        toastError(err, "Couldn't delete holiday");
      }
    });
  }

  return (
    <button type="button" disabled={pending} onClick={submit} className={className ?? "text-sm text-red-600 hover:underline"}>
      Delete
    </button>
  );
}
