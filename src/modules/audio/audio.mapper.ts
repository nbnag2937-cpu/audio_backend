import { AudioStatus } from "@prisma/client";

export interface AudioPartDto {
  id: string;
  partNumber: number;
  title: string;
  durationSec: number;
  // Chi co gia tri khi da duoc phep phat (owner xem chi tiet, hoac USER da mo khoa hom nay)
  audioUrl?: string;
}

export type AudioStatusDto = "processing" | "ready" | "failed";

// Kieu du lieu tra ve cho FE, khop voi AudioItem/AudioPart o file service cua FE
export interface AudioResponseDto {
  id: string;
  title: string;
  description: string | null;
  totalListened: number;
  totalListening: number;
  createdAt: Date;
  status: AudioStatusDto;
  parts: AudioPartDto[];
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
}

export function mapAudioStatus(status: AudioStatus): AudioStatusDto {
  return status.toLowerCase() as AudioStatusDto;
}

// Chia doi thoi luong audio thanh 2 "part" de FE hien thi (KHONG phai 2 file rieng biet,
// ca 2 part deu tro ve cung 1 audioUrl vi thuc chat chi co 1 file duy nhat tren R2)
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

// Chuyen 1 row Audio (tu Prisma) sang dang tra ve cho FE (co "parts", "status" dang lowercase).
// audioUrl chi duoc gan khi duoc phep xem file that (owner xem chi tiet, hoac da mo khoa).
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
    parts: buildAudioParts({
      audioId: audio.id,
      title: audio.title,
      durationSec: audio.durationSec,
      audioUrl,
    }),
  };
}

// Giong toAudioResponse nhung kem thong tin chu so huu - dung cho man SUPER_ADMIN xem toan bo audio
export function toAudioResponseWithOwner(
  audio: AudioRow,
  owner: { id: string; name: string; email: string },
  audioUrl?: string,
): AudioResponseWithOwnerDto {
  return { ...toAudioResponse(audio, audioUrl), owner };
}
