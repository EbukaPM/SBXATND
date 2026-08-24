"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await requirePermission("notifications", "view");
  await prisma.notification.updateMany({
    where: { id: notificationId, targetRole: user.role },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requirePermission("notifications", "view");
  await prisma.notification.updateMany({
    where: { targetRole: user.role, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/admin/notifications");
}
