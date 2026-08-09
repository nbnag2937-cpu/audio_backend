import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { CreateAdminInput } from "./superAdmin.validation";
import {
  AudioResponseWithOwnerDto,
  toAudioResponseWithOwner,
} from "../audio/audio.mapper";

const SALT_ROUNDS = 10;

// SUPER_ADMIN cap tai khoan cho ADMIN moi
export async function createAdminAccount(
  input: CreateAdminInput,
  createdById: string,
) {
  const existing = await prisma.account.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw ApiError.conflict("Email nay da duoc su dung");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const admin = await prisma.account.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: Role.ADMIN,
      createdById,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return admin;
}

// Danh sach toan bo ADMIN kem thong so tong hop (so audio, tong luot nghe...)
export async function listAllAdminsWithStats() {
  const admins = await prisma.account.findMany({
    where: { role: Role.ADMIN },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      audios: {
        select: { id: true, totalListening: true, totalListened: true },
      },
    },
  });

  return admins.map((admin) => {
    const totalAudios = admin.audios.length;
    const totalListening = admin.audios.reduce(
      (sum, a) => sum + a.totalListening,
      0,
    );
    const totalListened = admin.audios.reduce(
      (sum, a) => sum + a.totalListened,
      0,
    );

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      stats: { totalAudios, totalListening, totalListened },
    };
  });
}

export async function deleteAdminAccount(adminId: string) {
  const admin = await prisma.account.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== Role.ADMIN) {
    throw ApiError.notFound("Tai khoan admin khong ton tai");
  }

  // Audio cua admin se bi xoa theo (onDelete: Cascade trong schema).
  // Luu y: file tren R2 se KHONG tu dong bi xoa - can xoa thu cong hoac chay job don dep rieng.
  await prisma.account.delete({ where: { id: adminId } });

  return { id: adminId };
}

// Toan bo audio cua toan bo admin, kem ten chu so huu - danh cho man theo doi cua super admin
// Khong gan audioUrl o day (chi de xem thong tin/thong ke, khong phat thu tai day)
export async function listAllAudiosAcrossAdmins(): Promise<
  AudioResponseWithOwnerDto[]
> {
  const audios = await prisma.audio.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return audios.map((audio) => toAudioResponseWithOwner(audio, audio.owner));
}

export async function getSystemStats() {
  const [totalAdmins, totalAudios, aggregate] = await Promise.all([
    prisma.account.count({ where: { role: Role.ADMIN } }),
    prisma.audio.count(),
    prisma.audio.aggregate({
      _sum: { totalListening: true, totalListened: true },
    }),
  ]);

  return {
    totalAdmins,
    totalAudios,
    totalListening: aggregate._sum.totalListening ?? 0,
    totalListened: aggregate._sum.totalListened ?? 0,
  };
}
