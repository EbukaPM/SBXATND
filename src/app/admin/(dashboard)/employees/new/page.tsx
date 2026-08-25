import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { NewEmployeeForm } from "./NewEmployeeForm";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const [offices, departments] = await Promise.all([
    prisma.office.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader backHref="/admin/employees" backLabel="Back to employees">
        <h1 className="text-2xl font-bold">Add Employee</h1>
      </PageHeader>
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
        {offices.length === 0 ? (
          <p className="text-sm text-amber-700">Create an office first under Offices &amp; Network.</p>
        ) : (
          <NewEmployeeForm offices={offices} departments={departments} />
        )}
      </div>
    </>
  );
}
