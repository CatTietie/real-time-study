import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as studentController from "../controllers/code-problem-student.controller";

const router = Router();

router.get("/", authMiddleware, studentController.listPublishedProblems);
router.get("/:id", authMiddleware, studentController.getProblemDetail);
router.post("/:id/submit", authMiddleware, studentController.submitCode);
router.get("/:id/submissions", authMiddleware, studentController.getSubmissionHistory);

export default router;
