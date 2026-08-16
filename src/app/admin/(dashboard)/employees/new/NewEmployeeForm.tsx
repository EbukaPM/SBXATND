"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEmployeeAction, type EmployeeFormState } from "@/lib/actions/employees";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Department, Office } from "@prisma/client";

const initialState: EmployeeFormState = {};

export function NewEmployeeForm({ offices, departments }: { offices: Office[]; departments: Department[] }) {
  const [state, formAction, pending] = useActionState(createEmployeeAction, initialState);

  if (state.generatedAttendanceId) {
    return (
      <div className="max-w-md rounded-lg border border-green-300 bg-green-50 p-6 text-center">
        <p className="text-sm font-medium text-green-800">Employee created. Their Attendance ID is:</p>
        <p className="mt-2 rounded-md bg-white px-4 py-3 font-mono text-2xl font-bold tracking-widest">
          {state.generatedAttendanceId}
        </p>
        <p className="mt-3 text-xs text-green-800">
          This is shown once. Print or share it securely with the employee — it cannot be recovered later, only
          regenerated.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/admin/employees" className="text-sm text-primary hover:underline">
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
        <Field label="Middle name" name="middleName" />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />
        <Field label="Job title" name="jobTitle" />
        <div>
          <label className="mb-1 block text-sm font-medium">Office</label>
          <select name="officeId" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select office…</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Department</label>
          <select name="departmentId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Date employed" name="dateEmployed" type="date" />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create Employee"}
      </Button>
    </form>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
