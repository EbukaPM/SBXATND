"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAdminAction, type CreateAdminState } from "@/lib/actions/admins";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const initialState: CreateAdminState = {};

export function NewAdminForm() {
  const [state, formAction, pending] = useActionState(createAdminAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast({ title: "Couldn't add administrator", description: state.error, variant: "destructive" });
    else if (state.success) {
      toast({ title: "Administrator created", variant: "success" });
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name</label>
        <Input name="fullName" required className="h-9 w-48" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
        <Input name="email" type="email" required className="h-9 w-56" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Temporary password</label>
        <PasswordInput name="password" required minLength={10} className="h-9 w-48" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
        <select name="role" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="VIEWER">Viewer</option>
          <option value="HR">HR</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating…" : "Add Administrator"}
      </Button>
    </form>
  );
}
