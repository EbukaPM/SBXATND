import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySettings } from "@/lib/company/settings";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { BrandingForm } from "./BrandingForm";
import { AttendanceSettingsForm } from "./AttendanceSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [company, settings] = await Promise.all([getCompanySettings(), getAttendanceSettings()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

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
  );
}
