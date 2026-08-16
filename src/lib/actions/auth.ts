"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";
import { recordAuditLog } from "@/lib/audit/log";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = hdrs.get("user-agent");

  const rate = await checkRateLimit(`${ip}:${parsed.data.email.toLowerCase()}`, RATE_LIMITS.adminLogin);
  if (!rate.allowed) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const genericError = "Invalid email or password.";

  if (!user || !user.isActive) return { error: genericError };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordAuditLog({
      action: "admin.login_failed",
      resource: "user",
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });
    return { error: genericError };
  }

  await createSession(user.id, ip, userAgent);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAuditLog({
    userId: user.id,
    action: "admin.login",
    resource: "user",
    resourceId: user.id,
    ipAddress: ip,
    userAgent,
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
