import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import {
  createAudio,
  deleteAudio,
  getAudioDetailForOwner,
  listMyAudios,
  updateAudio,
} from "./audio.service";

function getRequester(req: Request) {
  if (!req.account) throw ApiError.unauthorized();
  return req.account;
}

// POST /api/audios  (multipart/form-data: audioFile + title + description)
export const createAudioHandler = asyncHandler(async (req: Request, res: Response) => {
  const requester = getRequester(req);
  if (!req.file) {
    throw ApiError.badRequest("Thieu file audio (field name: audioFile)");
  }

  const audio = await createAudio({
    input: req.body,
    ownerId: requester.accountId,
    file: req.file,
  });

  res.status(201).json({ success: true, data: audio });
});

// PUT /api/audios/:id
export const updateAudioHandler = asyncHandler(async (req: Request, res: Response) => {
  const requester = getRequester(req);
  const audio = await updateAudio({
    audioId: req.params.id,
    input: req.body,
    requester,
  });
  res.status(200).json({ success: true, data: audio });
});

// DELETE /api/audios/:id
export const deleteAudioHandler = asyncHandler(async (req: Request, res: Response) => {
  const requester = getRequester(req);
  const result = await deleteAudio({ audioId: req.params.id, requester });
  res.status(200).json({ success: true, data: result });
});

// GET /api/audios/mine
export const listMyAudiosHandler = asyncHandler(async (req: Request, res: Response) => {
  const requester = getRequester(req);
  const audios = await listMyAudios(requester.accountId);
  res.status(200).json({ success: true, data: audios });
});

// GET /api/audios/:id  (chi owner hoac super admin xem duoc chi tiet + playbackUrl de test)
export const getAudioDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const requester = getRequester(req);
  const audio = await getAudioDetailForOwner(req.params.id, requester);
  res.status(200).json({ success: true, data: audio });
});
