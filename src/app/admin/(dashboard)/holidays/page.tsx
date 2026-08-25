import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { CreateHolidayForm, DeleteHolidayButton } from "./HolidayActions";

export const dynamic = "force-dynamic";

export default async function HolidaysPage() {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "desc" } });

  return (
    <>
      <PageHeader>
        <h1 className="text-2xl font-bold">Holidays</h1>
        <p className="text-sm text-muted-foreground">
          Attendance on a listed holiday is recorded as HOLIDAY_OVERTIME (configurable in Settings).
        </p>
      </PageHeader>
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Add holiday</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateHolidayForm />
        </CardContent>
      </Card>

      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {holidays.map((h) => (
          <div key={h.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card p-4">
            <div className="min-w-0">
              <p className="font-medium">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.date.toISOString().slice(0, 10)}</p>
              {h.description ? <p className="mt-1 text-sm text-muted-foreground">{h.description}</p> : null}
            </div>
            <DeleteHolidayButton holidayId={h.id} className="shrink-0 text-sm text-red-600 hover:underline" />
          </div>
        ))}
        {holidays.length === 0 ? (
          <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No holidays configured.
          </p>
        ) : null}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className="border-b last:border-0">
                <td className="px-4 py-2">{h.date.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2">{h.name}</td>
                <td className="px-4 py-2">{h.description ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <DeleteHolidayButton holidayId={h.id} />
                </td>
              </tr>
            ))}
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No holidays configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
