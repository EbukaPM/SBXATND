import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import type { AdminRole, NotificationType } from "@prisma/client";

export interface NotifyRoleInput {
  type: NotificationType;
  title: string;
  message: string;
  targetRole: AdminRole;
  officeId?: string | null;
  /** Skip creating a new notification if one of the same type/office already
   * fired within this window — stops a flaky network from spamming an alert
   * per failed clock-in attempt. Omit for events that are naturally one-shot. */
  dedupeWindowMinutes?: number;
}

export async function notifyRole(input: NotifyRoleInput): Promise<void> {
  if (input.dedupeWindowMinutes) {
    const since = new Date(Date.now() - input.dedupeWindowMinutes * 60_000);
    const recent = await prisma.notification.findFirst({
      where: {
        type: input.type,
        targetRole: input.targetRole,
        officeId: input.officeId ?? null,
        createdAt: { gte: since },
      },
    });
    if (recent) return;
  }

  await prisma.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      targetRole: input.targetRole,
      officeId: input.officeId ?? null,
    },
  });

  const recipients = await prisma.user.findMany({
    where: { role: input.targetRole, isActive: true },
    select: { email: true },
  });

  await Promise.all(
    recipients.map((r) =>
      sendEmail({ to: r.email, subject: input.title, text: input.message }).catch((err) =>
        console.error(`[notifications] Email delivery failed for ${r.email}:`, err)
      )
    )
  );
}
