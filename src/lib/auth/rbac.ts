import type { AdminRole } from "@prisma/client";

/**
 * Coarse-grained permission map. SUPER_ADMIN implicitly has everything;
 * network security config is deliberately restricted to SUPER_ADMIN/ADMIN,
 * per the requirement that it "require elevated permission".
 */
export const PERMISSIONS = {
  employees: { view: ["SUPER_ADMIN", "ADMIN", "HR", "VIEWER"], manage: ["SUPER_ADMIN", "ADMIN", "HR"] },
  attendance: { view: ["SUPER_ADMIN", "ADMIN", "HR", "VIEWER"], manage: ["SUPER_ADMIN", "ADMIN", "HR"] },
  reports: { view: ["SUPER_ADMIN", "ADMIN", "HR", "VIEWER"] },
  qr: { view: ["SUPER_ADMIN", "ADMIN", "HR", "VIEWER"], manage: ["SUPER_ADMIN", "ADMIN"] },
  offices: { view: ["SUPER_ADMIN", "ADMIN", "HR", "VIEWER"], manage: ["SUPER_ADMIN", "ADMIN"] },
  network: { view: ["SUPER_ADMIN", "ADMIN"], manage: ["SUPER_ADMIN", "ADMIN"] },
  settings: { view: ["SUPER_ADMIN", "ADMIN"], manage: ["SUPER_ADMIN"] },
  admins: { view: ["SUPER_ADMIN"], manage: ["SUPER_ADMIN"] },
  auditLog: { view: ["SUPER_ADMIN", "ADMIN"] },
} as const satisfies Record<string, Record<string, readonly AdminRole[]>>;

export function hasPermission(
  role: AdminRole,
  resource: keyof typeof PERMISSIONS,
  action: string
): boolean {
  const allowed = (PERMISSIONS[resource] as Record<string, readonly AdminRole[]>)[action];
  if (!allowed) return false;
  return (allowed as readonly AdminRole[]).includes(role);
}
