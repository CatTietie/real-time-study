import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as exerciseController from "../controllers/exercise.controller";

const router = Router();

router.get("/banks/:bankId/questions", authMiddleware, exerciseController.getQuestionsForPractice);
router.post("/exercise/submit", authMiddleware, exerciseController.submitExercise);
router.get("/exercise/history", authMiddleware, exerciseController.getExerciseHistory);
router.get("/exercise/:recordId", authMiddleware, exerciseController.getExerciseResult);
router.get("/exercise/:recordId/tag-analysis", authMiddleware, exerciseController.getTagAnalysis);

export default router;
