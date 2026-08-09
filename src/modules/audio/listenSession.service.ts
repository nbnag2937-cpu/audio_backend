import { prisma } from "../../config/prisma";

const LISTENING_STALE_MS = 45 * 1000;

export async function heartbeatListening(
  audioId: string,
  deviceId: string,
): Promise<void> {
  await prisma.listenSession.upsert({
    where: { audioId_deviceId: { audioId, deviceId } },
    update: { lastHeartbeatAt: new Date() },
    create: { audioId, deviceId },
  });
}

export async function stopListening(
  audioId: string,
  deviceId: string,
): Promise<void> {
  await prisma.listenSession.deleteMany({ where: { audioId, deviceId } });
}

export async function getCurrentListenersMap(
  audioIds: string[],
): Promise<Map<string, number>> {
  if (audioIds.length === 0) return new Map();

  const staleThreshold = new Date(Date.now() - LISTENING_STALE_MS);

  await prisma.listenSession
    .deleteMany({ where: { lastHeartbeatAt: { lt: staleThreshold } } })
    .catch(() => undefined);

  const grouped = await prisma.listenSession.groupBy({
    by: ["audioId"],
    where: { audioId: { in: audioIds } },
    _count: { audioId: true },
  });

  return new Map(grouped.map((g) => [g.audioId, g._count.audioId]));
}

export async function getCurrentListenersCount(
  audioId: string,
): Promise<number> {
  const map = await getCurrentListenersMap([audioId]);
  return map.get(audioId) ?? 0;
}
