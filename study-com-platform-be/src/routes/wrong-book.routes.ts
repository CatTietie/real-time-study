import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as wrongBookController from "../controllers/wrong-book.controller";

const router = Router();

router.get("/wrong-book", authMiddleware, wrongBookController.getWrongBookList);
router.delete("/wrong-book/:id", authMiddleware, wrongBookController.removeWrongBookEntry);
router.post("/wrong-book/practice", authMiddleware, wrongBookController.getWrongQuestionsForPractice);

export default router;
