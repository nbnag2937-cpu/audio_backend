import { Router } from "express";
import {
  completeAudioHandler,
  getPublicAudioDetailHandler,
  listPublicAudiosHandler,
  listRankedAudiosHandler,
  streamAudioHandler,
} from "./public.controller";

const router = Router();

// Khong yeu cau dang nhap - danh cho role USER

// GET /api/public/audios/ranking - "dang nghe nhieu" / "top luot nghe", loc theo hom nay/thang/nam
// Dat TRUOC "/audios/:id" de tranh Express hieu nham "ranking" la 1 :id
router.get("/audios/ranking", listRankedAudiosHandler);

// GET /api/public/audios - toan bo audio + tim kiem + phan trang + sort (newest/updated)
router.get("/audios", listPublicAudiosHandler);

// GET /api/public/audios/:id - chi tiet 1 audio
router.get("/audios/:id", getPublicAudioDetailHandler);

// GET /api/public/audios/:id/stream?deviceId=xxx - lay URL phat (yeu cau da unlock hom nay)
router.get("/audios/:id/stream", streamAudioHandler);

// POST /api/public/audios/:id/complete - bao da nghe het bai
router.post("/audios/:id/complete", completeAudioHandler);

export default router;
