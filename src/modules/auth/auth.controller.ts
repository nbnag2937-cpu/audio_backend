import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getAccountProfile, loginAccount } from "./auth.service";
import { ApiError } from "../../utils/ApiError";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginAccount(req.body);
  res.status(200).json({ success: true, data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.account) {
    throw ApiError.unauthorized();
  }
  const profile = await getAccountProfile(req.account.accountId);
  res.status(200).json({ success: true, data: profile });
});
