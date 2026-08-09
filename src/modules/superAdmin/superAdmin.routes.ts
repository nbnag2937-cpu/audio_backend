import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createAdminSchema } from "./superAdmin.validation";
import {
  createAdminHandler,
  deleteAdminHandler,
  getStatsHandler,
  listAdminsHandler,
  listAllAudiosHandler,
} from "./superAdmin.controller";

const router = Router();

// Tat ca route trong file nay CHI danh cho SUPER_ADMIN
router.use(requireAuth, requireRole(Role.SUPER_ADMIN));

// POST /api/super-admin/admins - cap tai khoan admin moi
router.post("/admins", validateBody(createAdminSchema), createAdminHandler);

// GET /api/super-admin/admins - danh sach admin + thong so
router.get("/admins", listAdminsHandler);

// DELETE /api/super-admin/admins/:id - xoa tai khoan admin
router.delete("/admins/:id", deleteAdminHandler);

// GET /api/super-admin/audios - toan bo audio cua toan bo admin
router.get("/audios", listAllAudiosHandler);

// GET /api/super-admin/stats - thong ke tong quan he thong
router.get("/stats", getStatsHandler);

export default router;
