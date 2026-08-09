import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

// Cloudflare R2 tuong thich API voi AWS S3 nen dung chung @aws-sdk/client-s3
export const r2Client = new S3Client({
  region: "auto",
  endpoint: env.r2.endpoint,
  credentials: {
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  },
});

export const R2_BUCKET = env.r2.bucketName;
