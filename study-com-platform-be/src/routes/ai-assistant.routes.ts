import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getAiChatHistory, submitFeedback } from "../controllers/ai-assistant.controller";

const router = Router();

router.get("/history/:postId", authMiddleware, getAiChatHistory);
router.put("/feedback/:historyId", authMiddleware, submitFeedback);

export default router;
