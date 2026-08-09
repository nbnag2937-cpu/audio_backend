import { AudioStatus, ListenEventType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getAudioPlaybackUrl } from "../storage/storage.service";
import { isUnlockedToday } from "../unlock/unlock.service";
import { AudioResponseDto, toAudioResponse } from "../audio/audio.mapper";
import { getPeriodStartDate, RankingPeriod } from "../../utils/date";

export type PublicAudioSort = "newest" | "updated";
export type RankingMetric = "listening" | "listened";

// Danh sach audio public, ho tro tim kiem theo title + phan trang + sap xep.
// Chi hien thi audio status=READY (audio dang xu ly/loi khong duoc hien cho USER).
// Khong gan audioUrl trong parts o day - USER phai goi API stream (co check unlock) moi lay duoc.
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
  // Luu y: MySQL (collation mac dinh utf8mb4_unicode_ci) da tim kiem KHONG phan biet hoa/thuong san,
  // nen khong can truyen "mode: insensitive" nhu Postgres (Prisma khong ho tro option nay tren MySQL)
  const where = {
    status: AudioStatus.READY,
    ...(params.search ? { title: { contains: params.search } } : {}),
  };

  // "newest": audio moi dang (createdAt) - "updated": audio moi CHINH SUA gan day nhat (updatedAt)
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

  return {
    items: audios.map((audio) => toAudioResponse(audio)),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getPublicAudioDetail(
  audioId: string,
): Promise<AudioResponseDto> {
  const audio = await prisma.audio.findUnique({ where: { id: audioId } });
  // Audio chua READY thi coi nhu chua ton tai voi USER
  if (!audio || audio.status !== AudioStatus.READY) {
    throw ApiError.notFound("Audio khong ton tai");
  }
  return toAudioResponse(audio);
}

// Nguoi dung bam PHAT nhac -> yeu cau da unlock hom nay -> tra ve audio kem parts co audioUrl + tang totalListening
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
    // Ghi log kem thoi diem - dung de tinh ranking theo hom nay/thang/nam sau nay
    prisma.listenEvent.create({
      data: { audioId, type: ListenEventType.START },
    }),
  ]);

  return toAudioResponse(updated, playbackUrl);
}

// Client goi khi audio da phat het (vd: su kien 'ended' cua the <audio>) -> tang totalListened
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

// Audio "dang nghe nhieu" (metric=listening, dua tren so lan BAM PHAT trong khoang thoi gian)
// hoac "top luot nghe" (metric=listened, dua tren so lan NGHE HET bai trong khoang thoi gian).
// period: today | month | year | all - "all" tuong duong xep hang theo toan bo lich su.
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

  // Giu dung thu tu xep hang tu ket qua groupBy (audio bi xoa/khong READY se tu dong bi bo qua)
  return grouped
    .filter((g) => audioById.has(g.audioId))
    .map((g) => {
      const audio = audioById.get(g.audioId)!;
      return { ...toAudioResponse(audio), listenCount: g._count.audioId };
    });
}
