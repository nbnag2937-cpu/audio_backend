import { Router } from "express";
import { getOgPreview } from "./ogPreview.controller";

const router = Router();

router.get("/", getOgPreview);

export default router;
