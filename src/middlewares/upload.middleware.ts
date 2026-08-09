import multer from "multer";
import { ApiError } from "../utils/ApiError";

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
]);

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

// Luu file tam trong RAM (buffer) roi upload thang len R2, khong ghi ra disk cua server
export const uploadAudioFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(ApiError.badRequest(`Dinh dang file khong duoc ho tro: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  },
}).single("audioFile");
