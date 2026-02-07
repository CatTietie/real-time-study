// 管理员路由
import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import {
  authMiddleware,
  adminMiddleware,
  superAdminMiddleware,
} from "../middlewares/auth.middleware";
import * as rbacController from "../controllers/rbac.controller";
import * as communityController from "../controllers/community.controller";
import * as reportController from "../controllers/report.controller";
import * as sensitiveWordController from "../controllers/sensitive-word.controller";
import * as pointsRuleController from "../controllers/points-rule.controller";

const router = Router();

// 登录相关（不需要认证）
router.post("/login", adminController.login);

// 测试路由
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes working!" });
});

// 需要认证的路由
router.post("/logout", authMiddleware, adminMiddleware, adminController.logout);
router.get(
  "/profile",
  authMiddleware,
  adminMiddleware,
  adminController.getProfile,
);
router.put(
  "/editinfo",
  authMiddleware,
  adminMiddleware,
  adminController.editProfile,
);

// 操作日志相关（需要管理员权限）
router.get(
  "/logs",
  authMiddleware,
  adminMiddleware,
  adminController.getAdminLogs,
);
router.get(
  "/logs/stats",
  authMiddleware,
  adminMiddleware,
  adminController.getAdminLogStats,
);

// 超级管理员管理普通管理员
router.get(
  "/admins",
  authMiddleware,
  superAdminMiddleware,
  adminController.getAdmins,
);
router.post(
  "/admins",
  authMiddleware,
  superAdminMiddleware,
  adminController.createAdmin,
);
router.delete(
  "/admins/:id",
  authMiddleware,
  superAdminMiddleware,
  adminController.deleteAdmin,
);

// RBAC 角色与权限
router.get(
  "/rbac/roles",
  authMiddleware,
  adminMiddleware,
  rbacController.getRoles,
);
router.post(
  "/rbac/roles",
  authMiddleware,
  superAdminMiddleware,
  rbacController.createRole,
);
router.get(
  "/rbac/permissions",
  authMiddleware,
  adminMiddleware,
  rbacController.getPermissions,
);
router.post(
  "/rbac/roles/:id/permissions",
  authMiddleware,
  superAdminMiddleware,
  rbacController.setRolePermissions,
);
router.post(
  "/admins/:id/role",
  authMiddleware,
  superAdminMiddleware,
  rbacController.setAdminRole,
);

// 社区管理（管理员）
router.get(
  "/community/posts",
  authMiddleware,
  adminMiddleware,
  communityController.getCommunityPosts,
);
router.patch(
  "/community/posts/:id/status",
  authMiddleware,
  adminMiddleware,
  communityController.updateCommunityPostStatus,
);
router.get(
  "/community/comments",
  authMiddleware,
  adminMiddleware,
  communityController.getCommunityComments,
);
router.patch(
  "/community/comments/:id/status",
  authMiddleware,
  adminMiddleware,
  communityController.updateCommunityCommentStatus,
);
router.get(
  "/community/stats",
  authMiddleware,
  adminMiddleware,
  communityController.getCommunityStats,
);

// 敏感词库
router.get(
  "/sensitive-words",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.getSensitiveWords,
);
router.post(
  "/sensitive-words",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.createSensitiveWord,
);
router.put(
  "/sensitive-words/:id",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.updateSensitiveWord,
);
router.delete(
  "/sensitive-words/:id",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.deleteSensitiveWord,
);
router.patch(
  "/sensitive-words/:id/status",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.updateSensitiveWordStatus,
);
router.get(
  "/community/sensitive-words",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.getSensitiveWords,
);
router.post(
  "/community/sensitive-words",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.createSensitiveWord,
);
router.put(
  "/community/sensitive-words/:id",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.updateSensitiveWord,
);
router.delete(
  "/community/sensitive-words/:id",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.deleteSensitiveWord,
);
router.patch(
  "/community/sensitive-words/:id/status",
  authMiddleware,
  adminMiddleware,
  sensitiveWordController.updateSensitiveWordStatus,
);

// 举报处理
router.get(
  "/reports",
  authMiddleware,
  adminMiddleware,
  reportController.getReports,
);
router.patch(
  "/reports/:id/handle",
  authMiddleware,
  adminMiddleware,
  reportController.handleReport,
);
router.get(
  "/community/reports",
  authMiddleware,
  adminMiddleware,
  reportController.getReports,
);
router.patch(
  "/community/reports/:id/handle",
  authMiddleware,
  adminMiddleware,
  reportController.handleReport,
);

// 积分规则
router.get(
  "/points-rules",
  authMiddleware,
  adminMiddleware,
  pointsRuleController.getPointsRules,
);

export default router;
