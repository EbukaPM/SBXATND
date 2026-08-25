import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company/settings";
import { visibleNavItems } from "@/lib/auth/nav";
import { hasPermission } from "@/lib/auth/rbac";
import { getUnreadNotificationCount } from "@/lib/notifications/query";
import { Toaster } from "@/components/ui/toaster";
import { AdminSidebar } from "./AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const company = await getCompanySettings();
  const nav = visibleNavItems(user.role);
  const notificationCount = hasPermission(user.role, "notifications", "view")
    ? await getUnreadNotificationCount(user.role)
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <AdminSidebar
        companyName={company.companyName}
        logoUrl={company.logoUrl}
        nav={nav}
        user={user}
        notificationCount={notificationCount}
      />
      {/* Only this scrolls — the sidebar (desktop) and top bar (mobile) stay put. */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/40">
        {/* Clears the mobile fixed top bar; scrolls away with content, unlike the sticky page header below it. */}
        <div className="h-14 md:hidden" />
        {children}
      </main>
      <Toaster />
    </div>
  );
}
