import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettings } from "@/lib/company/settings";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { BrandingForm } from "./BrandingForm";
import { AttendanceSettingsForm } from "./AttendanceSettingsForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [company, settings] = await Promise.all([getCompanySettings(), getAttendanceSettings()]);

  return (
    <>
      <PageHeader>
        <h1 className="text-2xl font-bold">Settings</h1>
      </PageHeader>
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Company branding</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandingForm company={company} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance rules</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceSettingsForm settings={settings} />
        </CardContent>
      </Card>
      </div>
    </>
  );
}
