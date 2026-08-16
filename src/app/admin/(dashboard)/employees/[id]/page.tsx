import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateEmployeeAction } from "@/lib/actions/employees";
import { RegenerateIdButton } from "./RegenerateIdButton";
import { StatusButtons } from "./StatusButtons";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [employee, offices, departments, history] = await Promise.all([
    prisma.employee.findUnique({ where: { id }, include: { office: true, department: true } }),
    prisma.office.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.attendanceRecord.findMany({
      where: { employeeId: id },
      orderBy: { attendanceDate: "desc" },
      take: 15,
    }),
  ]);

  if (!employee) notFound();

  const updateWithId = updateEmployeeAction.bind(null, employee.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {employee.firstName} {employee.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {employee.employeeNumber} · {employee.office.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateWithId} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" name="firstName" defaultValue={employee.firstName} required />
              <Field label="Last name" name="lastName" defaultValue={employee.lastName} required />
              <Field label="Middle name" name="middleName" defaultValue={employee.middleName ?? ""} />
              <Field label="Email" name="email" defaultValue={employee.email ?? ""} type="email" />
              <Field label="Phone" name="phone" defaultValue={employee.phone ?? ""} />
              <Field label="Job title" name="jobTitle" defaultValue={employee.jobTitle ?? ""} />
              <div>
                <label className="mb-1 block text-sm font-medium">Office</label>
                <select
                  name="officeId"
                  defaultValue={employee.officeId}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Department</label>
                <select
                  name="departmentId"
                  defaultValue={employee.departmentId ?? ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">None</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Date employed"
                name="dateEmployed"
                type="date"
                defaultValue={employee.dateEmployed ? employee.dateEmployed.toISOString().slice(0, 10) : ""}
              />
              <div className="col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employment status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusButtons employeeId={employee.id} current={employee.employmentStatus} />
              {employee.employmentStatus !== "ACTIVE" ? (
                <p className="mt-2 text-xs text-amber-700">
                  Only ACTIVE employees can clock attendance.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance ID</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                The Attendance ID itself is never stored or displayed after creation — only a secure hash is kept.
                Regenerate it if the employee has lost their ID card.
              </p>
              <RegenerateIdButton employeeId={employee.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent attendance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Clock In</th>
                <th className="py-2 pr-4">Clock Out</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Type</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{r.attendanceDate.toISOString().slice(0, 10)}</td>
                  <td className="py-2 pr-4">{r.clockIn ? formatInTimeZone(r.clockIn, "Africa/Lagos", "h:mm a") : "—"}</td>
                  <td className="py-2 pr-4">{r.clockOut ? formatInTimeZone(r.clockOut, "Africa/Lagos", "h:mm a") : "—"}</td>
                  <td className="py-2 pr-4">{r.clockInStatus ?? "—"}</td>
                  <td className="py-2 pr-4">{r.attendanceType}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No attendance records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
