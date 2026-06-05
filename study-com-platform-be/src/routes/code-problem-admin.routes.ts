import { Router } from "express";
import {
  authMiddleware,
  adminMiddleware,
} from "../middlewares/auth.middleware";
import * as codeProblemController from "../controllers/code-problem.controller";

const router = Router();

// 题目 CRUD
router.post("/", authMiddleware, adminMiddleware, codeProblemController.createProblem);
router.get("/", authMiddleware, adminMiddleware, codeProblemController.getProblems);
router.get("/:id", authMiddleware, adminMiddleware, codeProblemController.getProblemById);
router.put("/:id", authMiddleware, adminMiddleware, codeProblemController.updateProblem);
router.delete("/:id", authMiddleware, adminMiddleware, codeProblemController.deleteProblem);
router.patch("/:id/status", authMiddleware, adminMiddleware, codeProblemController.toggleProblemStatus);

// 测试用例
router.post("/:id/test-cases", authMiddleware, adminMiddleware, codeProblemController.createTestCase);
router.get("/:id/test-cases", authMiddleware, adminMiddleware, codeProblemController.getTestCases);
router.put("/test-cases/:caseId", authMiddleware, adminMiddleware, codeProblemController.updateTestCase);
router.delete("/test-cases/:caseId", authMiddleware, adminMiddleware, codeProblemController.deleteTestCase);
router.post("/:id/test-cases/batch", authMiddleware, adminMiddleware, codeProblemController.batchCreateTestCases);

export default router;
