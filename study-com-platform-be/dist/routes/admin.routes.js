"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// 管理员路由
const express_1 = require("express");
const adminController = __importStar(require("../controllers/admin.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbacController = __importStar(require("../controllers/rbac.controller"));
const communityController = __importStar(require("../controllers/community.controller"));
const reportController = __importStar(require("../controllers/report.controller"));
const sensitiveWordController = __importStar(require("../controllers/sensitive-word.controller"));
const pointsRuleController = __importStar(require("../controllers/points-rule.controller"));
const router = (0, express_1.Router)();
// 登录相关（不需要认证）
router.post("/login", adminController.login);
// 测试路由
router.get("/test", (req, res) => {
    res.json({ message: "Admin routes working!" });
});
// 需要认证的路由
router.post("/logout", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, adminController.logout);
router.get("/profile", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, adminController.getProfile);
router.put("/editinfo", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, adminController.editProfile);
// 操作日志相关（需要管理员权限）
router.get("/logs", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, adminController.getAdminLogs);
router.get("/logs/stats", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, adminController.getAdminLogStats);
// 超级管理员管理普通管理员
router.get("/admins", auth_middleware_1.authMiddleware, auth_middleware_1.superAdminMiddleware, adminController.getAdmins);
router.post("/admins", auth_middleware_1.authMiddleware, auth_middleware_1.superAdminMiddleware, adminController.createAdmin);
router.delete("/admins/:id", auth_middleware_1.authMiddleware, auth_middleware_1.superAdminMiddleware, adminController.deleteAdmin);
// RBAC 角色与权限
router.get("/rbac/roles", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, rbacController.getRoles);
router.post("/rbac/roles", auth_middleware_1.authMiddleware, auth_middleware_1.superAdminMiddleware, rbacController.createRole);
router.get("/rbac/permissions", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, rbacController.getPermissions);
router.post("/rbac/roles/:id/permissions", auth_middleware_1.authMiddleware, auth_middleware_1.superAdminMiddleware, rbacController.setRolePermissions);
router.post("/admins/:id/role", auth_middleware_1.authMiddleware, auth_middleware_1.superAdminMiddleware, rbacController.setAdminRole);
// 社区管理（管理员）
router.get("/community/posts", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, communityController.getCommunityPosts);
router.patch("/community/posts/:id/status", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, communityController.updateCommunityPostStatus);
router.get("/community/comments", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, communityController.getCommunityComments);
router.patch("/community/comments/:id/status", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, communityController.updateCommunityCommentStatus);
router.get("/community/stats", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, communityController.getCommunityStats);
// 敏感词库
router.get("/sensitive-words", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.getSensitiveWords);
router.post("/sensitive-words", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.createSensitiveWord);
router.put("/sensitive-words/:id", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.updateSensitiveWord);
router.delete("/sensitive-words/:id", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.deleteSensitiveWord);
router.patch("/sensitive-words/:id/status", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.updateSensitiveWordStatus);
router.get("/community/sensitive-words", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.getSensitiveWords);
router.post("/community/sensitive-words", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.createSensitiveWord);
router.put("/community/sensitive-words/:id", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.updateSensitiveWord);
router.delete("/community/sensitive-words/:id", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.deleteSensitiveWord);
router.patch("/community/sensitive-words/:id/status", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, sensitiveWordController.updateSensitiveWordStatus);
// 举报处理
router.get("/reports", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, reportController.getReports);
router.patch("/reports/:id/handle", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, reportController.handleReport);
router.get("/community/reports", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, reportController.getReports);
router.patch("/community/reports/:id/handle", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, reportController.handleReport);
// 积分规则
router.get("/points-rules", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, pointsRuleController.getPointsRules);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map