// 管理员路由
import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import {
  authMiddleware,
  adminMiddleware,
  superAdminMiddleware,
  requirePermission,
} from "../middlewares/auth.middleware";
import * as rbacController from "../controllers/rbac.controller";
import * as communityController from "../controllers/community.controller";
import * as reportController from "../controllers/report.controller";
import * as sensitiveWordController from "../controllers/sensitive-word.controller";
import * as pointsRuleController from "../controllers/points-rule.controller";
import * as questionBankController from "../controllers/question-bank.controller";
import * as questionFeedbackController from "../controllers/question-feedback.controller";
import * as auditConfigController from "../controllers/audit-config.controller";

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
router.put(
  "/rbac/roles/:id",
  authMiddleware,
  superAdminMiddleware,
  rbacController.updateRole,
);
router.delete(
  "/rbac/roles/:id",
  authMiddleware,
  superAdminMiddleware,
  rbacController.deleteRole,
);
router.get(
  "/rbac/roles/:id/users",
  authMiddleware,
  adminMiddleware,
  rbacController.getRoleUsers,
);
router.get(
  "/rbac/permissions",
  authMiddleware,
  adminMiddleware,
  rbacController.getPermissions,
);
router.get(
  "/rbac/roles/:id/permissions",
  authMiddleware,
  adminMiddleware,
  rbacController.getRolePermissions,
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
router.post(
  "/community/posts/batch-audit",
  authMiddleware,
  adminMiddleware,
  communityController.batchAuditPosts,
);
router.get(
  "/community/audit-stats",
  authMiddleware,
  adminMiddleware,
  communityController.getAuditStats,
);
router.get(
  "/community/audit-config",
  authMiddleware,
  adminMiddleware,
  auditConfigController.getConfig,
);
router.put(
  "/community/audit-config",
  authMiddleware,
  adminMiddleware,
  auditConfigController.updateConfig,
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

// 题库管理
router.get("/professionals", authMiddleware, adminMiddleware, questionBankController.getProfessionals);
router.get("/categories", authMiddleware, adminMiddleware, questionBankController.getCategories);
router.get("/banks", authMiddleware, adminMiddleware, questionBankController.getBanks);
router.post("/bank", authMiddleware, adminMiddleware, questionBankController.createBank);
router.get("/bank/:id/questions", authMiddleware, adminMiddleware, questionBankController.getBankQuestions);
router.post("/question", authMiddleware, adminMiddleware, questionBankController.createQuestion);
router.post("/question/batch", authMiddleware, adminMiddleware, questionBankController.batchImportQuestions);
router.put("/question/:id", authMiddleware, adminMiddleware, questionBankController.updateQuestion);
router.delete("/question/:id", authMiddleware, adminMiddleware, questionBankController.deleteQuestion);
router.get("/questions/feedback-stats", authMiddleware, adminMiddleware, questionFeedbackController.getDislikedQuestions);

// 主观题批改
import * as exerciseReviewController from "../controllers/exercise-review.controller";
import codeProblemAdminRoutes from "./code-problem-admin.routes";
router.get("/exercise/reviews", authMiddleware, adminMiddleware, requirePermission("exercise.review.manage"), exerciseReviewController.getReviewList);
router.get("/exercise/reviews/stats", authMiddleware, adminMiddleware, requirePermission("exercise.review.manage"), exerciseReviewController.getReviewStats);
router.put("/exercise/review/:detailId", authMiddleware, adminMiddleware, requirePermission("exercise.review.manage"), exerciseReviewController.gradeAnswer);
router.post("/exercise/review/batch", authMiddleware, adminMiddleware, requirePermission("exercise.review.manage"), exerciseReviewController.batchGrade);

// 编程题库管理
router.use("/code-problems", codeProblemAdminRoutes);

// 知识文库管理
import * as knowledgeAdminController from "../controllers/knowledge-admin.controller";
router.get("/knowledge/categories", authMiddleware, adminMiddleware, knowledgeAdminController.adminListCategories);
router.post("/knowledge/categories", authMiddleware, adminMiddleware, requirePermission("knowledge.manage"), knowledgeAdminController.adminCreateCategory);
router.put("/knowledge/categories/:id", authMiddleware, adminMiddleware, requirePermission("knowledge.manage"), knowledgeAdminController.adminUpdateCategory);
router.delete("/knowledge/categories/:id", authMiddleware, adminMiddleware, requirePermission("knowledge.manage"), knowledgeAdminController.adminDeleteCategory);
router.get("/knowledge/documents", authMiddleware, adminMiddleware, knowledgeAdminController.adminListDocuments);
router.patch("/knowledge/documents/:id/audit", authMiddleware, adminMiddleware, requirePermission("knowledge.manage"), knowledgeAdminController.adminAuditDocument);
router.post("/knowledge/documents/batch/move", authMiddleware, adminMiddleware, requirePermission("knowledge.manage"), knowledgeAdminController.adminBatchMoveDocuments);
router.post("/knowledge/documents/batch/delete", authMiddleware, adminMiddleware, requirePermission("knowledge.manage"), knowledgeAdminController.adminBatchDeleteDocuments);
router.get("/knowledge/stats", authMiddleware, adminMiddleware, knowledgeAdminController.adminGetStats);

// 积分商城管理
import * as mallAdminController from "../controllers/mall-admin.controller";
import { uploadMallImage } from "../middlewares/upload.middleware";
router.post("/mall/upload", authMiddleware, adminMiddleware, uploadMallImage.single("file"), mallAdminController.uploadImage);
router.get("/mall/products", authMiddleware, adminMiddleware, mallAdminController.listProducts);
router.post("/mall/products", authMiddleware, adminMiddleware, mallAdminController.createProduct);
router.put("/mall/products/:id", authMiddleware, adminMiddleware, mallAdminController.updateProduct);
router.delete("/mall/products/:id", authMiddleware, adminMiddleware, mallAdminController.deleteProduct);
router.patch("/mall/products/:id/status", authMiddleware, adminMiddleware, mallAdminController.toggleProductStatus);
router.get("/mall/orders", authMiddleware, adminMiddleware, mallAdminController.listOrders);
router.patch("/mall/orders/:id/ship", authMiddleware, adminMiddleware, mallAdminController.shipOrder);
router.get("/mall/banners", authMiddleware, adminMiddleware, mallAdminController.listBanners);
router.post("/mall/banners", authMiddleware, adminMiddleware, mallAdminController.createBanner);
router.put("/mall/banners/:id", authMiddleware, adminMiddleware, mallAdminController.updateBanner);
router.delete("/mall/banners/:id", authMiddleware, adminMiddleware, mallAdminController.deleteBanner);
router.get("/mall/stats", authMiddleware, adminMiddleware, mallAdminController.getMallStats);

export default router;
