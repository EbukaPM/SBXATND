"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { logoutAction } from "@/lib/actions/auth";
import type { NavItem } from "@/lib/auth/nav";
import type { User } from "@prisma/client";

export function AdminSidebar({
  companyName,
  logoUrl,
  nav,
  user,
}: {
  companyName: string;
  logoUrl: string | null;
  nav: NavItem[];
  user: User;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-3 border-b p-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-9 w-9 object-contain" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-semibold">{companyName}</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <p className="truncate text-sm font-medium">{user.fullName}</p>
        <p className="mb-2 text-xs text-muted-foreground">{user.role.replace("_", " ")}</p>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
