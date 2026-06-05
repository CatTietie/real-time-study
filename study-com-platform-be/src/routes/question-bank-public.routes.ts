import { Router } from "express";
import * as qbPublicController from "../controllers/question-bank-public.controller";
import * as questionFeedbackController from "../controllers/question-feedback.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import exerciseRoutes from "./exercise.routes";
import wrongBookRoutes from "./wrong-book.routes";
import intelligentExerciseRoutes from "./intelligent-exercise.routes";
import codeExecutionRoutes from "./code-execution.routes";

const router = Router();

router.get("/professionals", qbPublicController.getProfessionals);
router.get("/categories", qbPublicController.getCategories);
router.get("/banks", qbPublicController.getBanks);

router.post("/question/:questionId/feedback", authMiddleware, questionFeedbackController.submitFeedback);
router.get("/question/:questionId/feedback", authMiddleware, questionFeedbackController.getMyFeedback);

router.use(exerciseRoutes);
router.use(wrongBookRoutes);
router.use(intelligentExerciseRoutes);
router.use(codeExecutionRoutes);

export default router;
