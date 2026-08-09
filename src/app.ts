import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes";
import audioRoutes from "./modules/audio/audio.routes";
import superAdminRoutes from "./modules/superAdmin/superAdmin.routes";
import publicRoutes from "./modules/public/public.routes";
import unlockRoutes from "./modules/unlock/unlock.routes";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { env } from "./config/env";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "OK" });
  });

  // ADMIN + SUPER_ADMIN dang nhap
  app.use("/api/auth", authRoutes);

  // CRUD audio - dung chung cho ADMIN va SUPER_ADMIN (phan quyen xu ly trong service)
  app.use("/api/audios", audioRoutes);

  // Rieng cho SUPER_ADMIN: quan ly admin, xem toan bo audio/thong ke
  app.use("/api/super-admin", superAdminRoutes);

  // Khong can dang nhap - danh cho USER nghe nhac
  app.use("/api/public", publicRoutes);

  // Co che mo khoa nghe nhac bang quang cao trong ngay
  app.use("/api/unlock", unlockRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
