import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { signAccessToken } from "../../utils/jwt";
import { LoginInput } from "./auth.validation";

// Dung chung cho ca ADMIN va SUPER_ADMIN dang nhap
export async function loginAccount(input: LoginInput) {
  const account = await prisma.account.findUnique({ where: { email: input.email } });

  if (!account || !account.isActive) {
    throw ApiError.unauthorized("Email hoac mat khau khong dung");
  }

  const isPasswordValid = await bcrypt.compare(input.password, account.password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Email hoac mat khau khong dung");
  }

  const accessToken = signAccessToken({ accountId: account.id, role: account.role });

  return {
    accessToken,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
    },
  };
}

export async function getAccountProfile(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!account) {
    throw ApiError.notFound("Tai khoan khong ton tai");
  }
  return account;
}
