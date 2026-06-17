import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getRecommendations,
  submitFeedback,
  triggerRecommendationEngine,
} from "../controllers/recommendation.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getRecommendations);
router.post("/:id/feedback", submitFeedback);
router.post("/trigger", triggerRecommendationEngine);

export default router;
