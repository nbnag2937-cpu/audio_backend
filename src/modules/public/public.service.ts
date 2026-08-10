import { AudioStatus, ListenEventType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getAudioPlaybackUrl } from "../storage/storage.service";
import { isUnlockedToday } from "../unlock/unlock.service";
import { AudioResponseDto, toAudioResponse } from "../audio/audio.mapper";
import { getPeriodStartDate, RankingPeriod } from "../../utils/date";
import {
  getCurrentListenersMap,
  heartbeatListening,
} from "../audio/listenSession.service";

export type PublicAudioSort = "newest" | "updated";
export type RankingMetric = "listening" | "listened";

export async function listPublicAudios(params: {
  search?: string;
  page: number;
  pageSize: number;
  sort: PublicAudioSort;
}): Promise<{
  items: AudioResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where = {
    status: AudioStatus.READY,
    ...(params.search ? { title: { contains: params.search } } : {}),
  };

  const orderBy =
    params.sort === "updated"
      ? { updatedAt: "desc" as const }
      : { createdAt: "desc" as const };

  const [audios, total] = await Promise.all([
    prisma.audio.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.audio.count({ where }),
  ]);

  const listenersMap = await getCurrentListenersMap(audios.map((a) => a.id));

  return {
    items: audios.map((audio) =>
      toAudioResponse(audio, undefined, listenersMap.get(audio.id) ?? 0),
    ),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getPublicAudioDetail(
  audioId: string,
): Promise<AudioResponseDto> {
  const audio = await prisma.audio.findUnique({ where: { id: audioId } });
  if (!audio || audio.status !== AudioStatus.READY) {
    throw ApiError.notFound("Audio khong ton tai");
  }
  const listenersMap = await getCurrentListenersMap([audioId]);
  return toAudioResponse(audio, undefined, listenersMap.get(audioId) ?? 0);
}

export async function getStreamUrl(
  audioId: string,
  deviceId: string,
): Promise<AudioResponseDto> {
  const unlocked = await isUnlockedToday(deviceId);
  if (!unlocked) {
    throw new ApiError(
      403,
      "Ban can bam vao quang cao de mo khoa nghe nhac hom nay",
      "UNLOCK_REQUIRED",
    );
  }

  const audio = await prisma.audio.findUnique({ where: { id: audioId } });
  if (!audio || audio.status !== AudioStatus.READY) {
    throw ApiError.notFound("Audio khong ton tai hoac chua san sang de phat");
  }

  const [playbackUrl, updated] = await Promise.all([
    getAudioPlaybackUrl(audio.fileKey),
    prisma.audio.update({
      where: { id: audioId },
      data: { totalListening: { increment: 1 } },
    }),
    prisma.listenEvent.create({
      data: { audioId, type: ListenEventType.START },
    }),
    heartbeatListening(audioId, deviceId),
  ]);

  return toAudioResponse(updated, playbackUrl, 1);
}

export async function markAudioCompleted(audioId: string) {
  const audio = await prisma.audio.findUnique({ where: { id: audioId } });
  if (!audio) {
    throw ApiError.notFound("Audio khong ton tai");
  }

  const [updated] = await Promise.all([
    prisma.audio.update({
      where: { id: audioId },
      data: { totalListened: { increment: 1 } },
    }),
    prisma.listenEvent.create({
      data: { audioId, type: ListenEventType.COMPLETE },
    }),
  ]);

  return { id: updated.id, totalListened: updated.totalListened };
}

export async function listRankedAudios(params: {
  metric: RankingMetric;
  period: RankingPeriod;
  limit: number;
}): Promise<Array<AudioResponseDto & { listenCount: number }>> {
  const eventType =
    params.metric === "listening"
      ? ListenEventType.START
      : ListenEventType.COMPLETE;
  const startDate = getPeriodStartDate(params.period);

  const grouped = await prisma.listenEvent.groupBy({
    by: ["audioId"],
    where: {
      type: eventType,
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
    },
    _count: { audioId: true },
    orderBy: { _count: { audioId: "desc" } },
    take: params.limit,
  });

  if (grouped.length === 0) return [];

  const audioIds = grouped.map((g) => g.audioId);
  const audios = await prisma.audio.findMany({
    where: { id: { in: audioIds }, status: AudioStatus.READY },
  });
  const audioById = new Map(audios.map((audio) => [audio.id, audio]));

  const readyAudioIds = audios.map((a) => a.id);
  const listenersMap = await getCurrentListenersMap(readyAudioIds);

  return grouped
    .filter((g) => audioById.has(g.audioId))
    .map((g) => {
      const audio = audioById.get(g.audioId)!;
      return {
        ...toAudioResponse(audio, undefined, listenersMap.get(audio.id) ?? 0),
        listenCount: g._count.audioId,
      };
    });
}
