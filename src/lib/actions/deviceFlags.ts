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

const reviewSchema = z.object({
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function reviewDeviceFlagAction(flagId: string, formData: FormData): Promise<void> {
  const user = await requirePermission("deviceFlags", "manage");
  const parsed = reviewSchema.parse(Object.fromEntries(formData));

  await prisma.attendanceDeviceFlag.update({
    where: { id: flagId },
    data: {
      reviewed: true,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote: parsed.note || null,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "device_flag.reviewed",
    resource: "attendance_device_flag",
    resourceId: flagId,
    reason: parsed.note || null,
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/device-flags");
}
