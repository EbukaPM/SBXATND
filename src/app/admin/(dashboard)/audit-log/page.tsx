import { prisma } from "@/lib/db/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string; page?: string }>;
}) {
  const { action, resource, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = 50;

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (resource) where.resource = { contains: resource, mode: "insensitive" };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <>
      <PageHeader>
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </PageHeader>
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
      <form className="flex flex-wrap gap-2">
        <Input name="action" defaultValue={action} placeholder="Filter by action…" className="w-56" />
        <Input name="resource" defaultValue={resource} placeholder="Filter by resource…" className="w-56" />
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Resource</th>
              <th className="px-4 py-2">IP</th>
              <th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-2">{log.createdAt.toLocaleString()}</td>
                <td className="px-4 py-2">{log.user?.fullName ?? "System"}</td>
                <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {log.resource}
                  {log.resourceId ? `:${log.resourceId.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{log.ipAddress ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{log.reason ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No audit log entries found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {total} total entries · page {pageNum}
      </p>
      </div>
    </>
  );
}
