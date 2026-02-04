// 用户路由
import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", userController.login);
router.post("/register", userController.register);
router.get("/permissions", authMiddleware, userController.getMyPermissions);
router.get("/:id", authMiddleware, userController.getUser);
router.put("/:id", authMiddleware, userController.updateUser);

export default router;
