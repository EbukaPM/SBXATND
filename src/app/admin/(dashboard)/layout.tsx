import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company/settings";
import { visibleNavItems } from "@/lib/auth/nav";
import { AdminSidebar } from "./AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const company = await getCompanySettings();
  const nav = visibleNavItems(user.role);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar companyName={company.companyName} logoUrl={company.logoUrl} nav={nav} user={user} />
      <main className="flex-1 overflow-x-hidden bg-muted/40 p-4 pt-20 sm:p-6 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}
