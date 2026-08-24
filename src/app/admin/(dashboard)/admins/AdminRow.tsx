"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setAdminActiveAction } from "@/lib/actions/admins";
import type { User } from "@prisma/client";

export function AdminActiveToggle({ admin }: { admin: User }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => setAdminActiveAction(admin.id, !admin.isActive))}
    >
      {admin.isActive ? "Disable" : "Enable"}
    </Button>
  );
}

export function AdminRow({ admin, isSelf }: { admin: User; isSelf: boolean }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2">{admin.fullName}</td>
      <td className="px-4 py-2">{admin.email}</td>
      <td className="px-4 py-2">{admin.role.replace("_", " ")}</td>
      <td className="px-4 py-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${admin.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
          {admin.isActive ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="px-4 py-2">{admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "Never"}</td>
      <td className="px-4 py-2 text-right">
        {!isSelf ? <AdminActiveToggle admin={admin} /> : <span className="text-xs text-muted-foreground">You</span>}
      </td>
    </tr>
  );
}
