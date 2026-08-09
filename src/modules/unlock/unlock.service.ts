import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

const UNLOCK_INTERVAL_MS = 30 * 60 * 1000; // 30 phut

// Bam link ads -> ghi nhan/gia han unlock cho deviceId
export async function unlockForToday(deviceId: string) {
  const now = new Date();

  const log = await prisma.unlockLog.upsert({
    where: { deviceId },
    update: { lastUnlockAt: now },
    create: { deviceId, lastUnlockAt: now },
  });

  return {
    deviceId,
    unlocked: true,
    unlockedAt: log.lastUnlockAt,
    expiresAt: new Date(log.lastUnlockAt.getTime() + UNLOCK_INTERVAL_MS),
  };
}

export async function isUnlockedToday(deviceId: string): Promise<{
  unlocked: boolean;
  remainingSeconds: number;
}> {
  const log = await prisma.unlockLog.findUnique({ where: { deviceId } });

  if (!log) {
    return { unlocked: false, remainingSeconds: 0 };
  }

  const elapsedMs = Date.now() - log.lastUnlockAt.getTime();
  const remainingMs = UNLOCK_INTERVAL_MS - elapsedMs;

  if (remainingMs <= 0) {
    return { unlocked: false, remainingSeconds: 0 };
  }

  return { unlocked: true, remainingSeconds: Math.ceil(remainingMs / 1000) };
}

export function getAdLink(): string {
  return env.adLinkUrl;
}
