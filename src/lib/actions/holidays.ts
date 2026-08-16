"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { recordAuditLog } from "@/lib/audit/log";

async function actorIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const holidaySchema = z.object({
  name: z.string().min(1).max(120),
  date: z.string().min(1),
  description: z.string().max(300).optional().or(z.literal("")),
});

export async function createHolidayAction(formData: FormData): Promise<void> {
  const user = await requirePermission("settings", "manage");
  const parsed = holidaySchema.parse(Object.fromEntries(formData));

  const holiday = await prisma.holiday.create({
    data: {
      name: parsed.name,
      date: new Date(`${parsed.date}T00:00:00.000Z`),
      description: parsed.description || null,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "holiday.created",
    resource: "holiday",
    resourceId: holiday.id,
    newValue: { name: parsed.name, date: parsed.date },
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/holidays");
}

export async function deleteHolidayAction(holidayId: string): Promise<void> {
  const user = await requirePermission("settings", "manage");
  await prisma.holiday.delete({ where: { id: holidayId } });
  await recordAuditLog({
    userId: user.id,
    action: "holiday.deleted",
    resource: "holiday",
    resourceId: holidayId,
    ipAddress: await actorIp(),
  });
  revalidatePath("/admin/holidays");
}
