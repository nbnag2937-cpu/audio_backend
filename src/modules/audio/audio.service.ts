import { AudioStatus, Prisma, Role } from "@prisma/client";
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

async function createAudioWithAutoTitle(params: {
  input: CreateAudioInput;
  ownerId: string;
  fileMeta: {
    fileKey: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    durationSec: number;
    status: AudioStatus;
  };
}) {
  const run = () =>
    prisma.$transaction(
      async (tx) => {
        let title = params.input.title;

        if (!title) {
          const count = await tx.audio.count({
            where: { ownerId: params.ownerId },
          });
          title = `Audio Không Quảng Cáo ${count + 1}`;
        }

        return tx.audio.create({
          data: {
            title,
            description: params.input.description ?? null,
            adLinkUrl: params.input.adLinkUrl ?? null,
            fileKey: params.fileMeta.fileKey,
            originalFileName: params.fileMeta.originalFileName,
            mimeType: params.fileMeta.mimeType,
            fileSize: params.fileMeta.fileSize,
            durationSec: params.fileMeta.durationSec,
            status: params.fileMeta.status,
            ownerId: params.ownerId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

  try {
    return await run();
  } catch (err) {
    // Loi P2034: transaction conflict do Serializable isolation (2 request tao dong thoi)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2034"
    ) {
      return run();
    }
    throw err;
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

  const audio = await createAudioWithAutoTitle({
    input: params.input,
    ownerId: params.ownerId,
    fileMeta: {
      fileKey,
      originalFileName: params.file.originalname,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
      durationSec: durationSec ?? 0,
      status: durationSec !== null ? AudioStatus.READY : AudioStatus.FAILED,
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

export async function listMyAudios(
  ownerId: string,
): Promise<AudioResponseDto[]> {
  const audios = await prisma.audio.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
  return audios.map((audio) => toAudioResponse(audio));
}

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
