import { getCompanySettings } from "@/lib/company/settings";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const company = await getCompanySettings();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.companyName} className="mx-auto mb-3 h-16 w-16 object-contain" />
          ) : null}
          <h1 className="text-xl font-bold">{company.companyName}</h1>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
