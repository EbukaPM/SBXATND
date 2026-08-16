/**
 * Initial deployment seed: creates the first SUPER_ADMIN and default settings rows.
 * Safe to re-run — every step is idempotent (upsert / findFirst-or-create).
 *
 * Required env vars: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME.
 * Intentionally has no hard-coded fallback credentials — see docs/DEPLOYMENT_VERCEL.md.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed the first administrator.\n" +
        "Example: SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='a-strong-password' npm run db:seed"
    );
  }
  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase(), passwordHash, fullName: name, role: "SUPER_ADMIN" },
  });
  console.log(`Super admin ready: ${admin.email}`);

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  console.log("Default company settings ready.");

  await prisma.attendanceSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  console.log("Default attendance settings ready (Africa/Lagos, 09:00 start, 15min grace, QR + Network mode).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
