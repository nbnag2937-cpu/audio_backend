import { prisma } from "../../config/prisma";
import { getTodayDateKey } from "../../utils/date";
import { env } from "../../config/env";

// Bam link ads -> ghi nhan unlock cho deviceId trong ngay hom nay
export async function unlockForToday(deviceId: string) {
  const date = getTodayDateKey();

  // upsert de tranh loi trung unique khi user bam nhieu lan trong cung 1 ngay
  await prisma.unlockLog.upsert({
    where: { deviceId_date: { deviceId, date } },
    update: {},
    create: { deviceId, date },
  });

  return { deviceId, date, unlocked: true };
}

export async function isUnlockedToday(deviceId: string): Promise<boolean> {
  const date = getTodayDateKey();
  const log = await prisma.unlockLog.findUnique({
    where: { deviceId_date: { deviceId, date } },
  });
  return Boolean(log);
}

export function getAdLink(): string {
  return env.adLinkUrl;
}
