import { AudioStatus } from "@prisma/client";
import { env } from "../../config/env";
export interface AudioPartDto {
  id: string;
  partNumber: number;
  title: string;
  durationSec: number;
  audioUrl?: string;
}

export type AudioStatusDto = "processing" | "ready" | "failed";

export interface AudioResponseDto {
  id: string;
  title: string;
  description: string | null;
  totalListened: number;
  totalListening: number;
  createdAt: Date;
  status: AudioStatusDto;
  parts: AudioPartDto[];
  adLinkUrl: string;
}

export interface AudioResponseWithOwnerDto extends AudioResponseDto {
  owner: { id: string; name: string; email: string };
}

interface AudioRow {
  id: string;
  title: string;
  description: string | null;
  totalListened: number;
  totalListening: number;
  createdAt: Date;
  durationSec: number;
  status: AudioStatus;
  adLinkUrl: string | null;
}

export function mapAudioStatus(status: AudioStatus): AudioStatusDto {
  return status.toLowerCase() as AudioStatusDto;
}

function splitDurationInHalf(totalDurationSec: number): [number, number] {
  const firstPartSec = Math.floor(totalDurationSec / 2);
  const secondPartSec = totalDurationSec - firstPartSec;
  return [firstPartSec, secondPartSec];
}

export function buildAudioParts(params: {
  audioId: string;
  title: string;
  durationSec: number;
  audioUrl?: string;
}): AudioPartDto[] {
  const partDurationsSec = splitDurationInHalf(params.durationSec);

  return partDurationsSec.map((durationSec, index) => ({
    id: `${params.audioId}-p${index + 1}`,
    partNumber: index + 1,
    title: params.title,
    durationSec,
    ...(params.audioUrl ? { audioUrl: params.audioUrl } : {}),
  }));
}

export function toAudioResponse(
  audio: AudioRow,
  audioUrl?: string,
): AudioResponseDto {
  return {
    id: audio.id,
    title: audio.title,
    description: audio.description,
    totalListened: audio.totalListened,
    totalListening: audio.totalListening,
    createdAt: audio.createdAt,
    status: mapAudioStatus(audio.status),
    adLinkUrl: audio.adLinkUrl ?? env.adLinkUrl,
    parts: buildAudioParts({
      audioId: audio.id,
      title: audio.title,
      durationSec: audio.durationSec,
      audioUrl,
    }),
  };
}

export function toAudioResponseWithOwner(
  audio: AudioRow,
  owner: { id: string; name: string; email: string },
  audioUrl?: string,
): AudioResponseWithOwnerDto {
  return { ...toAudioResponse(audio, audioUrl), owner };
}
