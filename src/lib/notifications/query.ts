import { prisma } from "@/lib/db/prisma";
import type { AdminRole } from "@prisma/client";

export async function getUnreadNotificationCount(role: AdminRole): Promise<number> {
  return prisma.notification.count({ where: { targetRole: role, read: false } });
}
