import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { parseBuffer } from "music-metadata";
import { randomUUID } from "crypto";
import path from "path";
import { r2Client, R2_BUCKET } from "../../config/r2";
import { env } from "../../config/env";

const PRESIGNED_URL_EXPIRES_SECONDS = 60 * 60; // 1 gio

// Upload buffer audio len Cloudflare R2, tra ve fileKey de luu trong DB
// Doc thoi luong that (giay) tu buffer file audio - dung truoc khi upload de luu vao DB.
// Neu file loi/khong doc duoc metadata, tra ve null de service goi xu ly status FAILED.
export async function readAudioDurationSec(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<number | null> {
  try {
    const metadata = await parseBuffer(params.buffer, params.mimeType);
    const durationSec = metadata.format.duration;
    if (!durationSec || durationSec <= 0) return null;
    return Math.round(durationSec);
  } catch {
    return null;
  }
}

export async function uploadAudioToR2(params: {
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
}): Promise<{ fileKey: string }> {
  const ext = path.extname(params.originalFileName) || "";
  const fileKey = `audios/${randomUUID()}${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      Body: params.buffer,
      ContentType: params.mimeType,
    }),
  );

  return { fileKey };
}

export async function deleteAudioFromR2(fileKey: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
    }),
  );
}

// Tra ve URL de client phat audio.
// Neu bucket da bat public/custom domain (R2_PUBLIC_BASE_URL) -> tra ve link tinh, load nhanh.
// Neu khong -> tao presigned URL, het han sau 1 gio (an toan hon, khong public bucket).
export async function getAudioPlaybackUrl(fileKey: string): Promise<string> {
  if (env.r2.publicBaseUrl) {
    return `${env.r2.publicBaseUrl.replace(/\/$/, "")}/${fileKey}`;
  }

  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: fileKey });
  return getSignedUrl(r2Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
  });
}
