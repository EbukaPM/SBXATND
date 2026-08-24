import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { MarkAllReadButton, MarkReadButton } from "./NotificationActions";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  NETWORK_IP_CHANGED: "Network",
  EMPLOYEE_DELETION_REQUESTED: "Deletion request",
};

export default async function NotificationsPage() {
  const user = await requirePermission("notifications", "view");

  const notifications = await prisma.notification.findMany({
    where: { targetRole: user.role },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 ? <MarkAllReadButton /> : null}
        </div>
      </PageHeader>
      <div className="space-y-3 px-4 py-6 sm:px-6 md:px-8">
        {notifications.map((n) => (
          <Card key={n.id} className={n.read ? "" : "border-primary/40 bg-primary/5"}>
            <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{n.createdAt.toLocaleString()}</p>
              </div>
              {!n.read ? <MarkReadButton notificationId={n.id} /> : null}
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-normal text-muted-foreground">No notifications yet.</CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </>
  );
}
