"use client";

import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOfficeAction } from "@/lib/actions/offices";
import { toast, toastError } from "@/hooks/use-toast";

export function CreateOfficeForm() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await createOfficeAction(formData);
        toast({ title: "Office added", variant: "success" });
        formRef.current?.reset();
      } catch (err) {
        toastError(err, "Couldn't add office");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-wrap items-end gap-2">
      <div className="w-full sm:w-48">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
        <Input name="name" required className="h-9 w-full" placeholder="Head Office" />
      </div>
      <div className="w-full sm:w-64">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
        <Input name="address" className="h-9 w-full" placeholder="12 Admiralty Way, Lekki" />
      </div>
      <div className="w-full sm:w-40">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Timezone</label>
        <Input name="timezone" defaultValue="Africa/Lagos" className="h-9 w-full" />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding…" : "Add Office"}
      </Button>
    </form>
  );
}
