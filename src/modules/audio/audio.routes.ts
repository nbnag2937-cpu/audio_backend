import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { uploadAudioFile } from "../../middlewares/upload.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createAudioSchema, updateAudioSchema } from "./audio.validation";
import {
  createAudioHandler,
  deleteAudioHandler,
  getAudioDetailHandler,
  listMyAudiosHandler,
  updateAudioHandler,
} from "./audio.controller";

const router = Router();

// Tat ca route trong file nay yeu cau dang nhap voi role ADMIN hoac SUPER_ADMIN
router.use(requireAuth, requireRole(Role.ADMIN, Role.SUPER_ADMIN));

// GET /api/audios/mine - danh sach audio cua chinh minh
router.get("/mine", listMyAudiosHandler);

// GET /api/audios/:id - xem chi tiet 1 audio (phai la owner, hoac la SUPER_ADMIN)
router.get("/:id", getAudioDetailHandler);

// POST /api/audios - tao audio moi (multipart/form-data)
router.post("/", uploadAudioFile, validateBody(createAudioSchema), createAudioHandler);

// PUT /api/audios/:id - cap nhat title/description
router.put("/:id", validateBody(updateAudioSchema), updateAudioHandler);

// DELETE /api/audios/:id - xoa audio (xoa ca file tren R2)
router.delete("/:id", deleteAudioHandler);

export default router;
