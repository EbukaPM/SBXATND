"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { recordAuditLog } from "@/lib/audit/log";
import { generateRegistrationToken } from "@/lib/network/agentAuth";
import { getClientIpFromHeaders } from "@/lib/network/getClientIp";
import { nanoid } from "nanoid";

async function actorIp(): Promise<string> {
  const hdrs = await headers();
  return getClientIpFromHeaders(hdrs) ?? "unknown";
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

export interface AuthorizeNetworkResult {
  ip: string;
}

/**
 * Alternative to the Python Network Agent for offices with no dedicated
 * always-on machine to run it: an admin who is physically connected to the
 * office network they want to authorize clicks this, and the server captures
 * *their own* current request IP — via the same trusted getClientIp() path
 * every other security decision uses, never a client-supplied value — and
 * sets it as the office's authorized network. Nothing else about attendance
 * verification changes; this just populates OfficeNetwork.currentPublicIp
 * through a different (manual) route than an agent heartbeat would.
 */
export async function authorizeCurrentNetworkAction(networkId: string): Promise<AuthorizeNetworkResult> {
  const user = await requirePermission("network", "manage");
  const hdrs = await headers();
  const ip = getClientIpFromHeaders(hdrs);

  if (!ip) {
    throw new Error("Could not determine your current network's IP address. Please try again.");
  }

  const network = await prisma.officeNetwork.update({
    where: { id: networkId },
    data: { currentPublicIp: ip, lastVerifiedAt: new Date(), status: "VERIFIED" },
  });

  // Recorded as a heartbeat too (not just the audit log) so "View Heartbeats" history
  // stays a complete picture of how the network got authorized, agent or manual.
  await prisma.networkHeartbeat.create({
    data: {
      officeNetworkId: network.id,
      agentId: `manual:${user.id}`,
      sourceIp: ip,
      reportedIp: ip,
      timestamp: new Date(),
      status: "MANUAL_ADMIN",
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "network.manually_authorized",
    resource: "office_network",
    resourceId: networkId,
    newValue: { ip },
    ipAddress: ip,
  });

  revalidatePath("/admin/offices");
  return { ip };
}
