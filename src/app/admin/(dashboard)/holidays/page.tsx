import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createHolidayAction, deleteHolidayAction } from "@/lib/actions/holidays";

export const dynamic = "force-dynamic";

export default async function HolidaysPage() {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Holidays</h1>
      <p className="text-sm text-muted-foreground">
        Attendance on a listed holiday is recorded as HOLIDAY_OVERTIME (configurable in Settings).
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Add holiday</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createHolidayAction} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <Input name="name" required className="h-9 w-56" placeholder="Independence Day" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" name="date" required className="h-9 w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <Input name="description" className="h-9 w-64" />
            </div>
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-card">
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
                  <form action={deleteHolidayAction.bind(null, h.id)}>
                    <button type="submit" className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
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
  );
}
