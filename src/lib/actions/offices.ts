"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { recordAuditLog } from "@/lib/audit/log";
import { generateRegistrationToken } from "@/lib/network/agentAuth";
import { nanoid } from "nanoid";

async function actorIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const officeSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().or(z.literal("")),
  timezone: z.string().min(1).max(60),
});

export async function createOfficeAction(formData: FormData): Promise<void> {
  const user = await requirePermission("offices", "manage");
  const parsed = officeSchema.parse(Object.fromEntries(formData));

  const office = await prisma.office.create({
    data: { name: parsed.name, address: parsed.address || null, timezone: parsed.timezone },
  });

  await recordAuditLog({
    userId: user.id,
    action: "office.created",
    resource: "office",
    resourceId: office.id,
    newValue: { name: parsed.name },
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/offices");
}

const departmentSchema = z.object({ name: z.string().min(1).max(80) });

export async function createDepartmentAction(formData: FormData): Promise<void> {
  const user = await requirePermission("employees", "manage");
  const parsed = departmentSchema.parse(Object.fromEntries(formData));

  const dept = await prisma.department.create({ data: { name: parsed.name } });

  await recordAuditLog({
    userId: user.id,
    action: "department.created",
    resource: "department",
    resourceId: dept.id,
    newValue: { name: parsed.name },
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/offices");
}

const networkSchema = z.object({
  officeId: z.string().min(1),
  name: z.string().min(1).max(80),
  cidr: z.string().max(60).optional().or(z.literal("")),
  failMode: z.enum(["FAIL_CLOSED", "FAIL_OPEN"]),
});

export interface CreateNetworkResult {
  agentId: string;
  registrationToken: string;
}

/** Creates the OfficeNetwork row and a one-time registration token for the field agent. */
export async function createOfficeNetworkAction(formData: FormData): Promise<CreateNetworkResult> {
  const user = await requirePermission("network", "manage");
  const parsed = networkSchema.parse(Object.fromEntries(formData));

  const agentId = nanoid(16);
  const { token, hash } = await generateRegistrationToken();

  const network = await prisma.officeNetwork.create({
    data: {
      officeId: parsed.officeId,
      name: parsed.name,
      cidr: parsed.cidr || null,
      failMode: parsed.failMode,
      agentId,
      registrationTokenHash: hash,
      status: "UNVERIFIED",
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "network.created",
    resource: "office_network",
    resourceId: network.id,
    newValue: { officeId: parsed.officeId, name: parsed.name },
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/offices");
  return { agentId, registrationToken: token };
}

export async function regenerateNetworkTokenAction(networkId: string): Promise<{ registrationToken: string }> {
  const user = await requirePermission("network", "manage");
  const { token, hash } = await generateRegistrationToken();

  await prisma.officeNetwork.update({
    where: { id: networkId },
    data: { registrationTokenHash: hash, registrationTokenUsedAt: null, agentSigningSecret: null, status: "UNVERIFIED" },
  });

  await recordAuditLog({
    userId: user.id,
    action: "network.token_regenerated",
    resource: "office_network",
    resourceId: networkId,
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/offices");
  return { registrationToken: token };
}

export async function setNetworkEnabledAction(networkId: string, enabled: boolean): Promise<void> {
  const user = await requirePermission("network", "manage");

  await prisma.officeNetwork.update({
    where: { id: networkId },
    data: { status: enabled ? "UNVERIFIED" : "DISABLED" },
  });

  await recordAuditLog({
    userId: user.id,
    action: enabled ? "network.enabled" : "network.disabled",
    resource: "office_network",
    resourceId: networkId,
    ipAddress: await actorIp(),
  });

  revalidatePath("/admin/offices");
}

export async function setNetworkFailModeAction(networkId: string, failMode: "FAIL_CLOSED" | "FAIL_OPEN"): Promise<void> {
  const user = await requirePermission("network", "manage");
  await prisma.officeNetwork.update({ where: { id: networkId }, data: { failMode } });
  await recordAuditLog({
    userId: user.id,
    action: "network.fail_mode_changed",
    resource: "office_network",
    resourceId: networkId,
    newValue: { failMode },
    ipAddress: await actorIp(),
  });
  revalidatePath("/admin/offices");
}
