import Link from "next/link";
import { getCompanySettings } from "@/lib/company/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const company = await getCompanySettings();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted px-6 text-center">
      {company.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logoUrl} alt={company.companyName} className="h-20 w-20 object-contain" />
      ) : null}
      <h1 className="text-3xl font-bold">{company.companyName}</h1>
      <p className="text-muted-foreground">Digital Office Attendance System</p>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:gap-4">
        <Link
          href="/register"
          className="rounded-md bg-primary px-6 py-3 text-center font-medium text-primary-foreground"
        >
          Staff Register
        </Link>
        <Link href="/admin/login" className="rounded-md border px-6 py-3 text-center font-medium">
          Admin Login
        </Link>
      </div>
    </div>
  );
}
