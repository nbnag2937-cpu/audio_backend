import { Router } from "express";
import { login, me } from "./auth.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import { loginSchema } from "./auth.validation";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

// POST /api/auth/login
router.post("/login", validateBody(loginSchema), login);

// GET /api/auth/me  (ADMIN hoac SUPER_ADMIN dang dang nhap)
router.get("/me", requireAuth, me);

export default router;
