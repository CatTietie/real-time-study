import { Router } from "express";
import * as intelligentController from "../controllers/intelligent-exercise.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/tag-mastery", authMiddleware, intelligentController.getTagMastery);
router.post("/intelligent/generate", authMiddleware, intelligentController.generatePaper);

export default router;
