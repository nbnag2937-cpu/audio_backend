import { Router } from "express";
import {
  completeAudioHandler,
  getPublicAudioDetailHandler,
  heartbeatListenHandler,
  listPublicAudiosHandler,
  listRankedAudiosHandler,
  stopListenHandler,
  streamAudioHandler,
} from "./public.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import { listenSessionBodySchema } from "./public.validation";

const router = Router();

// Khong yeu cau dang nhap - danh cho role USER

// GET /api/public/audios/ranking - "dang nghe nhieu" / "top luot nghe", loc theo hom nay/thang/nam
router.get("/audios/ranking", listRankedAudiosHandler);

// GET /api/public/audios - toan bo audio + tim kiem + phan trang + sort (newest/updated)
router.get("/audios", listPublicAudiosHandler);

// GET /api/public/audios/:id - chi tiet 1 audio
router.get("/audios/:id", getPublicAudioDetailHandler);

// GET /api/public/audios/:id/stream?deviceId=xxx - lay URL phat (yeu cau da unlock hom nay)
router.get("/audios/:id/stream", streamAudioHandler);

// POST /api/public/audios/:id/complete - bao da nghe het bai
router.post("/audios/:id/complete", completeAudioHandler);

// POST /api/public/audios/:id/listen-heartbeat - bao "van dang nghe", goi dinh ky trong luc phat
router.post(
  "/audios/:id/listen-heartbeat",
  validateBody(listenSessionBodySchema),
  heartbeatListenHandler,
);

// POST /api/public/audios/:id/listen-stop - bao dung nghe ngay (best-effort, khong bat buoc thanh cong)
router.post(
  "/audios/:id/listen-stop",
  validateBody(listenSessionBodySchema),
  stopListenHandler,
);

export default router;
