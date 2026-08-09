import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getAdLink, isUnlockedToday, unlockForToday } from "./unlock.service";
import { ApiError } from "../../utils/ApiError";

export const getAdLinkHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { adLinkUrl: getAdLink() } });
  },
);

// POST /api/unlock/click - goi API nay SAU KHI nguoi dung da bam vao link ads
export const clickUnlock = asyncHandler(async (req: Request, res: Response) => {
  const result = await unlockForToday(req.body.deviceId);
  res.status(200).json({ success: true, data: result });
});

// GET /api/unlock/status?deviceId=xxx - kiem tra con hieu luc unlock khong
export const getUnlockStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId;
    if (typeof deviceId !== "string" || deviceId.length < 8) {
      throw ApiError.badRequest("Query param deviceId khong hop le");
    }
    const { unlocked, remainingSeconds } = await isUnlockedToday(deviceId);
    res
      .status(200)
      .json({ success: true, data: { deviceId, unlocked, remainingSeconds } });
  },
);
