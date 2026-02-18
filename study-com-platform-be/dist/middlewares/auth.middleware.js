"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminMiddleware = exports.adminMiddleware = exports.authMiddleware = void 0;
const auth_service_1 = require("../services/auth.service");
/**
 * JWT 认证中间件
 */
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "未提供 Token，请先登录",
            });
        }
        const decoded = (0, auth_service_1.verifyToken)(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Token 无效或已过期，请重新登录",
            });
        }
        // 将用户信息挂在 req 上
        req.user = decoded;
        next();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "认证失败";
        res.status(401).json({
            success: false,
            message,
        });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * 管理员权限中间件
 */
const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        if (req.user.role !== "admin" && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "只有管理员可以访问此接口",
            });
        }
        next();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "权限验证失败";
        res.status(403).json({
            success: false,
            message,
        });
    }
};
exports.adminMiddleware = adminMiddleware;
/**
 * 超级管理员权限中间件
 */
const superAdminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        if (req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "只有超级管理员可以访问此接口",
            });
        }
        next();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "权限验证失败";
        res.status(403).json({
            success: false,
            message,
        });
    }
};
exports.superAdminMiddleware = superAdminMiddleware;
exports.default = exports.authMiddleware;
//# sourceMappingURL=auth.middleware.js.map