import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { NewAdminForm } from "./NewAdminForm";
import { AdminRow } from "./AdminRow";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const [admins, self] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administrators</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add administrator</CardTitle>
        </CardHeader>
        <CardContent>
          <NewAdminForm />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last login</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <AdminRow key={a.id} admin={a} isSelf={a.id === self?.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
