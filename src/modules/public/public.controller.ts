import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import {
  getPublicAudioDetail,
  getStreamUrl,
  listPublicAudios,
  listRankedAudios,
  markAudioCompleted,
} from "./public.service";
import { listAudiosQuerySchema, rankingQuerySchema } from "./public.validation";

// GET /api/public/audios?search=&page=&pageSize=&sort=newest|updated
export const listPublicAudiosHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = listAudiosQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues.map((i) => i.message).join(" | "),
        "VALIDATION_ERROR",
      );
    }

    const result = await listPublicAudios(parsed.data);
    res.status(200).json({ success: true, data: result });
  },
);

// GET /api/public/audios/:id
export const getPublicAudioDetailHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const audio = await getPublicAudioDetail(req.params.id);
    res.status(200).json({ success: true, data: audio });
  },
);

// GET /api/public/audios/:id/stream?deviceId=xxx
export const streamAudioHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId;
    if (typeof deviceId !== "string" || deviceId.length < 8) {
      throw ApiError.badRequest("Query param deviceId khong hop le");
    }

    const result = await getStreamUrl(req.params.id, deviceId);
    res.status(200).json({ success: true, data: result });
  },
);

// POST /api/public/audios/:id/complete
export const completeAudioHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await markAudioCompleted(req.params.id);
    res.status(200).json({ success: true, data: result });
  },
);

// GET /api/public/audios/ranking?metric=listening|listened&period=today|month|year|all&limit=10
// metric=listening -> "dang nghe nhieu" (dua tren so lan bam phat)
// metric=listened   -> "top luot nghe" (dua tren so lan nghe het bai)
export const listRankedAudiosHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = rankingQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues.map((i) => i.message).join(" | "),
        "VALIDATION_ERROR",
      );
    }

    const result = await listRankedAudios(parsed.data);
    res.status(200).json({ success: true, data: result });
  },
);
