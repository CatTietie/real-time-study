import { Router } from "express";
import * as learningGoalController from "../controllers/learning-goal.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

/**
 * 学习目标相关路由
 * 所有路由都需要认证
 */

// 获取当前用户的学习目标
router.get("/me", authMiddleware, learningGoalController.getCurrentUserLearningGoal);

// 设置当前用户的学习目标
router.post("/me", authMiddleware, learningGoalController.setCurrentUserLearningGoal);

// 获取指定用户的学习目标（管理员）
router.get("/:userId", authMiddleware, learningGoalController.getUserLearningGoalById);

// 删除用户的学习目标（管理员）
router.delete("/:userId", authMiddleware, learningGoalController.deleteUserLearningGoal);

// 获取所有学习目标列表（管理员）
router.get("/", authMiddleware, learningGoalController.getAllLearningGoals);

// 批量获取用户学习目标
router.post("/batch", authMiddleware, learningGoalController.getBatchLearningGoals);

export default router;