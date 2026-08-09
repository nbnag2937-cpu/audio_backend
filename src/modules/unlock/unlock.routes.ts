import { Router } from "express";
import { clickUnlock, getAdLinkHandler, getUnlockStatus } from "./unlock.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import { unlockClickSchema } from "./unlock.validation";

const router = Router();

router.get("/ad-link", getAdLinkHandler);
router.post("/click", validateBody(unlockClickSchema), clickUnlock);
router.get("/status", getUnlockStatus);

export default router;
