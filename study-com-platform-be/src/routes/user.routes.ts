// 用户路由
import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", userController.login);
router.post("/register", userController.register);
router.get("/permissions", authMiddleware, userController.getMyPermissions);
// 用户资料相关路由
router.get("/profile/:userId", authMiddleware, userController.getUserProfile);
router.get("/study-stats/:userId", authMiddleware, userController.getUserStudyStats);
router.put("/profile/:userId", authMiddleware, userController.updateUserProfile);
router.get("/:id", authMiddleware, userController.getUser);
router.put("/:id", authMiddleware, userController.updateUser);

export default router;
