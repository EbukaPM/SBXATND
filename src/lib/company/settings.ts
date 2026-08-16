import { prisma } from "@/lib/db/prisma";
import type { CompanySettings } from "@prisma/client";

const SINGLETON_ID = "singleton";

const DEFAULTS: Omit<CompanySettings, "id" | "updatedAt"> = {
  companyName: "Your Company",
  logoUrl: null,
  primaryColor: "#0F766E",
  secondaryColor: "#0EA5E9",
  accentColor: "#F59E0B",
  address: null,
  phone: null,
  email: null,
  website: null,
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const existing = await prisma.companySettings.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;
  return prisma.companySettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...DEFAULTS },
    update: {},
  });
}

export async function updateCompanySettings(
  data: Partial<Omit<CompanySettings, "id" | "updatedAt">>
): Promise<CompanySettings> {
  return prisma.companySettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...DEFAULTS, ...data },
    update: data,
  });
}
