import { prisma } from "@/lib/db/prisma";
import { NewEmployeeForm } from "./NewEmployeeForm";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const [offices, departments] = await Promise.all([
    prisma.office.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add Employee</h1>
      {offices.length === 0 ? (
        <p className="text-sm text-amber-700">Create an office first under Offices &amp; Network.</p>
      ) : (
        <NewEmployeeForm offices={offices} departments={departments} />
      )}
    </div>
  );
}
