import { cookies } from "next/headers";
import { getCompanySettings } from "@/lib/company/settings";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { getActiveQrSession } from "@/lib/qr/session";
import { QR_SESSION_COOKIE } from "@/lib/attendance/clockHandler";
import { AttendanceKiosk } from "@/components/attendance/AttendanceKiosk";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; qr?: string }>;
}) {
  const { error } = await searchParams;
  const [company, settings] = await Promise.all([getCompanySettings(), getAttendanceSettings()]);

  const requiresQr = settings.attendanceMode === "QR_AND_NETWORK" || settings.attendanceMode === "QR_ONLY";

  let hasValidQrSession = false;
  if (requiresQr) {
    const store = await cookies();
    const token = store.get(QR_SESSION_COOKIE)?.value;
    if (token) {
      const session = await getActiveQrSession(token);
      hasValidQrSession = session.ok;
    }
  }

  if (requiresQr && !hasValidQrSession && !error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-6 py-12 text-center">
        <div className="w-full max-w-md rounded-2xl border bg-card p-10 shadow-sm">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.companyName} className="mx-auto mb-4 h-20 w-20 object-contain" />
          ) : null}
          <h1 className="text-2xl font-bold">{company.companyName}</h1>
          <p className="mt-6 text-lg font-medium">Today&apos;s attendance requires QR verification.</p>
          <p className="mt-2 text-muted-foreground">
            Please scan the attendance QR code displayed at the office.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AttendanceKiosk
      companyName={company.companyName}
      logoUrl={company.logoUrl}
      kioskResetSeconds={settings.kioskResetSeconds}
      initialError={error ?? null}
      hasQrSession={hasValidQrSession}
    />
  );
}
