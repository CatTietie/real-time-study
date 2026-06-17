import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as codeExecutionController from "../controllers/code-execution.controller";

const router = Router();

router.post("/code/execute", authMiddleware, codeExecutionController.runCode);
router.post("/code/submit", authMiddleware, codeExecutionController.submitCode);
router.get("/code/history/:questionId", authMiddleware, codeExecutionController.getHistory);

export default router;
