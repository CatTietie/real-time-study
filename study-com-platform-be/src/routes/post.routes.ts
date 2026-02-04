// 帖子路由
import { Router } from "express";
import * as postController from "../controllers/post.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, postController.createPost);
router.get("/:id", postController.getPost);

export default router;
