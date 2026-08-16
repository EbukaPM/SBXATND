"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/guard";
import { updateCompanySettings, getCompanySettings } from "@/lib/company/settings";
import { updateAttendanceSettings } from "@/lib/attendance/settings";
import { uploadImage, UploadValidationError } from "@/lib/storage/blob";
import { recordAuditLog } from "@/lib/audit/log";

async function actorIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #0F766E");

const brandingSchema = z.object({
  companyName: z.string().min(1).max(120),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
});

export interface BrandingState {
  error?: string;
  success?: boolean;
}

export async function updateBrandingAction(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  const user = await requirePermission("settings", "manage");
  const parsed = brandingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const before = await getCompanySettings();
  let logoUrl = before.logoUrl;

  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      const uploaded = await uploadImage("logos", logoFile);
      logoUrl = uploaded.url;
    } catch (err) {
      if (err instanceof UploadValidationError) return { error: err.message };
      throw err;
    }
  }

  await updateCompanySettings({
    companyName: parsed.data.companyName,
    primaryColor: parsed.data.primaryColor,
    secondaryColor: parsed.data.secondaryColor,
    accentColor: parsed.data.accentColor,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    website: parsed.data.website || null,
    logoUrl,
  });

  await recordAuditLog({
    userId: user.id,
    action: "branding.updated",
    resource: "company_settings",
    ipAddress: await actorIp(),
  });

  revalidatePath("/", "layout");
  return { success: true };
}

const attendanceSettingsSchema = z.object({
  timezone: z.string().min(1),
  workStart: z.string().regex(/^\d{2}:\d{2}$/),
  gracePeriodMinutes: z.coerce.number().int().min(0).max(180),
  workEnd: z.string().regex(/^\d{2}:\d{2}$/),
  attendanceMode: z.enum(["NETWORK_ONLY", "QR_AND_NETWORK", "QR_ONLY"]),
  weekendIsOvertime: z.coerce.boolean(),
  holidayIsOvertime: z.coerce.boolean(),
  qrSessionMinutes: z.coerce.number().int().min(1).max(120),
  networkHeartbeatIntervalMinutes: z.coerce.number().int().min(1).max(120),
  networkStaleThresholdMinutes: z.coerce.number().int().min(1).max(1440),
  kioskResetSeconds: z.coerce.number().int().min(2).max(60),
  crossOfficeAttendance: z.coerce.boolean(),
});

export async function updateAttendanceSettingsAction(formData: FormData): Promise<void> {
  const user = await requirePermission("settings", "manage");
  const raw = Object.fromEntries(formData);
  const parsed = attendanceSettingsSchema.parse({
    ...raw,
    weekendIsOvertime: raw.weekendIsOvertime === "on",
    holidayIsOvertime: raw.holidayIsOvertime === "on",
    crossOfficeAttendance: raw.crossOfficeAttendance === "on",
  });

  await updateAttendanceSettings(parsed);

  await recordAuditLog({
    userId: user.id,
    action: "attendance_mode.changed",
    resource: "attendance_settings",
    newValue: parsed,
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/attendance");
}
