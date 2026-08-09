import { AudioStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import {
  deleteAudioFromR2,
  getAudioPlaybackUrl,
  readAudioDurationSec,
  uploadAudioToR2,
} from "../storage/storage.service";
import { CreateAudioInput, UpdateAudioInput } from "./audio.validation";
import { AudioResponseDto, toAudioResponse } from "./audio.mapper";

interface RequesterContext {
  accountId: string;
  role: Role;
}

// SUPER_ADMIN duoc thao tac tren audio cua BAT KY admin nao, ADMIN chi duoc tren audio cua chinh minh
function assertCanModify(
  audioOwnerId: string,
  requester: RequesterContext,
): void {
  if (requester.role === Role.SUPER_ADMIN) return;
  if (audioOwnerId !== requester.accountId) {
    throw ApiError.forbidden(
      "Ban chi co the thao tac tren audio cua chinh minh",
    );
  }
}

export async function createAudio(params: {
  input: CreateAudioInput;
  ownerId: string;
  file: Express.Multer.File;
}): Promise<AudioResponseDto> {
  const durationSec = await readAudioDurationSec({
    buffer: params.file.buffer,
    mimeType: params.file.mimetype,
  });

  const { fileKey } = await uploadAudioToR2({
    buffer: params.file.buffer,
    originalFileName: params.file.originalname,
    mimeType: params.file.mimetype,
  });

  const audio = await prisma.audio.create({
    data: {
      title: params.input.title,
      description: params.input.description ?? null,
      adLinkUrl: params.input.adLinkUrl ?? null,
      fileKey,
      originalFileName: params.file.originalname,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
      durationSec: durationSec ?? 0,
      status: durationSec !== null ? AudioStatus.READY : AudioStatus.FAILED,
      ownerId: params.ownerId,
    },
  });

  return toAudioResponse(audio);
}

export async function updateAudio(params: {
  audioId: string;
  input: UpdateAudioInput;
  requester: RequesterContext;
}): Promise<AudioResponseDto> {
  const audio = await prisma.audio.findUnique({
    where: { id: params.audioId },
  });
  if (!audio) {
    throw ApiError.notFound("Audio khong ton tai");
  }
  assertCanModify(audio.ownerId, params.requester);

  const updated = await prisma.audio.update({
    where: { id: params.audioId },
    data: {
      title: params.input.title ?? undefined,
      description: params.input.description ?? undefined,
      adLinkUrl: params.input.adLinkUrl ?? undefined,
    },
  });

  return toAudioResponse(updated);
}

export async function deleteAudio(params: {
  audioId: string;
  requester: RequesterContext;
}) {
  const audio = await prisma.audio.findUnique({
    where: { id: params.audioId },
  });
  if (!audio) {
    throw ApiError.notFound("Audio khong ton tai");
  }
  assertCanModify(audio.ownerId, params.requester);

  await deleteAudioFromR2(audio.fileKey);
  await prisma.audio.delete({ where: { id: params.audioId } });

  return { id: params.audioId };
}

// Danh sach audio cua chinh 1 admin (dung cho trang quan ly cua ADMIN)
// Khong gan audioUrl o day de tranh phai tao presigned URL cho ca danh sach (ton phi/thoi gian)
export async function listMyAudios(
  ownerId: string,
): Promise<AudioResponseDto[]> {
  const audios = await prisma.audio.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
  return audios.map((audio) => toAudioResponse(audio));
}

// Xem chi tiet 1 audio cua chinh minh (hoac cua ai do, neu la SUPER_ADMIN) - co audioUrl de admin preview lai
export async function getAudioDetailForOwner(
  audioId: string,
  requester: RequesterContext,
): Promise<AudioResponseDto> {
  const audio = await prisma.audio.findUnique({ where: { id: audioId } });
  if (!audio) {
    throw ApiError.notFound("Audio khong ton tai");
  }
  assertCanModify(audio.ownerId, requester);

  const playbackUrl = await getAudioPlaybackUrl(audio.fileKey);
  return toAudioResponse(audio, playbackUrl);
}
