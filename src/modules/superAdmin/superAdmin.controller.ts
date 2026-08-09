import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createAdminAccount,
  deleteAdminAccount,
  getSystemStats,
  listAllAdminsWithStats,
  listAllAudiosAcrossAdmins,
} from "./superAdmin.service";
import { ApiError } from "../../utils/ApiError";

function getRequesterId(req: Request): string {
  if (!req.account) throw ApiError.unauthorized();
  return req.account.accountId;
}

// POST /api/super-admin/admins
export const createAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  const createdById = getRequesterId(req);
  const admin = await createAdminAccount(req.body, createdById);
  res.status(201).json({ success: true, data: admin });
});

// GET /api/super-admin/admins
export const listAdminsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await listAllAdminsWithStats();
  res.status(200).json({ success: true, data: admins });
});

// DELETE /api/super-admin/admins/:id
export const deleteAdminHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteAdminAccount(req.params.id);
  res.status(200).json({ success: true, data: result });
});

// GET /api/super-admin/audios
export const listAllAudiosHandler = asyncHandler(async (_req: Request, res: Response) => {
  const audios = await listAllAudiosAcrossAdmins();
  res.status(200).json({ success: true, data: audios });
});

// GET /api/super-admin/stats
export const getStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getSystemStats();
  res.status(200).json({ success: true, data: stats });
});
