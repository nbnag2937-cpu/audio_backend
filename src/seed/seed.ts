import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

// Chay 1 lan de tao tai khoan SUPER_ADMIN dau tien (khong the tu dang ky qua API)
// Lenh: npm run seed
async function main(): Promise<void> {
  const { email, password, name } = env.seedSuperAdmin;

  if (!email || !password) {
    throw new Error(
      "[seed] Thieu SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD trong file .env"
    );
  }

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Tai khoan ${email} da ton tai, bo qua.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.account.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`[seed] Da tao SUPER_ADMIN: ${superAdmin.email} (id: ${superAdmin.id})`);
}

main()
  .catch((error) => {
    console.error("[seed] Loi:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
