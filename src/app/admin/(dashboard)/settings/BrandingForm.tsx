"use client";

import { useActionState } from "react";
import { updateBrandingAction, type BrandingState } from "@/lib/actions/settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CompanySettings } from "@prisma/client";

const initialState: BrandingState = {};

export function BrandingForm({ company }: { company: CompanySettings }) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {company.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logoUrl} alt="Current logo" className="h-16 w-16 object-contain" />
      ) : null}
      <div>
        <label className="mb-1 block text-sm font-medium">Logo (PNG, JPEG or SVG, max 5MB)</label>
        <input type="file" name="logo" accept="image/png,image/jpeg,image/jpg,image/svg+xml" className="text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Company name</label>
        <Input name="companyName" defaultValue={company.companyName} required />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <ColorField label="Primary" name="primaryColor" defaultValue={company.primaryColor} />
        <ColorField label="Secondary" name="secondaryColor" defaultValue={company.secondaryColor} />
        <ColorField label="Accent" name="accentColor" defaultValue={company.accentColor} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <Input name="address" defaultValue={company.address ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <Input name="phone" defaultValue={company.phone ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <Input name="email" type="email" defaultValue={company.email ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Website</label>
          <Input name="website" defaultValue={company.website ?? ""} />
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">Branding updated.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}

function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" name={`${name}Picker`} defaultValue={defaultValue} className="h-10 w-10 rounded border" onChange={(e) => {
          const target = e.currentTarget.form?.elements.namedItem(name) as HTMLInputElement | null;
          if (target) target.value = e.currentTarget.value;
        }} />
        <Input name={name} defaultValue={defaultValue} className="flex-1" />
      </div>
    </div>
  );
}
