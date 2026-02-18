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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdmin = exports.createAdmin = exports.getAdmins = exports.getAdminLogStats = exports.getAdminLogs = exports.editProfile = exports.getProfile = exports.logout = exports.login = void 0;
const sequelize_1 = require("sequelize");
const authService = __importStar(require("../services/auth.service"));
const adminLogService = __importStar(require("../services/admin-log.service"));
const logger_1 = require("../utils/logger");
const user_model_1 = __importDefault(require("../models/user.model"));
const role_model_1 = __importDefault(require("../models/role.model"));
const password_1 = require("../utils/password");
/**
 * 管理员登录
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // 参数验证
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "用户名和密码不能为空",
            });
        }
        // 执行登录逻辑
        const result = await authService.adminLogin(username, password);
        // 记录操作日志
        await adminLogService.recordAdminLog(result.id, adminLogService.ActionTypes.LOGIN, undefined, undefined, `用户 ${username} 登录成功`, req);
        (0, logger_1.log)(`管理员 ${username} 登录成功`);
        res.json({
            success: true,
            message: "登录成功",
            data: result,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "登录失败";
        (0, logger_1.error)(`管理员登录失败: ${message}`);
        res.status(401).json({
            success: false,
            message,
        });
    }
};
exports.login = login;
/**
 * 管理员登出
 */
const logout = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        // 记录操作日志
        await adminLogService.recordAdminLog(req.user.id, adminLogService.ActionTypes.LOGOUT, undefined, undefined, `用户 ${req.user.username} 登出`, req);
        (0, logger_1.log)(`管理员 ${req.user.username} 登出`);
        res.json({
            success: true,
            message: "登出成功",
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "登出失败";
        (0, logger_1.error)(`管理员登出失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.logout = logout;
/**
 * 获取管理员个人信息
 */
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        const profile = await authService.getAdminProfile(req.user.id);
        res.json({
            success: true,
            message: "获取信息成功",
            data: profile,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "获取信息失败";
        (0, logger_1.error)(`获取管理员信息失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.getProfile = getProfile;
/**
 * 修改管理员个人信息
 */
const editProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        const { nickname, avatar } = req.body;
        // 参数验证
        if (!nickname && !avatar) {
            return res.status(400).json({
                success: false,
                message: "至少需要修改一项信息",
            });
        }
        if (nickname && nickname.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "昵称不能为空",
            });
        }
        const updateData = {};
        if (nickname)
            updateData.nickname = nickname;
        if (avatar)
            updateData.avatar = avatar;
        const updatedProfile = await authService.updateAdminProfile(req.user.id, updateData);
        // 记录操作日志
        await adminLogService.recordAdminLog(req.user.id, "修改个人信息", "users", req.user.id, `修改了个人信息: ${Object.keys(updateData).join(", ")}`, req);
        (0, logger_1.log)(`管理员 ${req.user.username} 修改了个人信息`);
        res.json({
            success: true,
            message: "修改成功",
            data: updatedProfile,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "修改失败";
        (0, logger_1.error)(`修改管理员信息失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.editProfile = editProfile;
/**
 * 获取操作日志列表
 */
const getAdminLogs = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        const { page = 1, pageSize = 20, adminId, actionType } = req.query;
        const result = await adminLogService.getAdminLogs({
            page: Number(page),
            pageSize: Number(pageSize),
            adminId: adminId ? Number(adminId) : undefined,
            actionType: actionType,
        });
        res.json({
            success: true,
            message: "获取操作日志成功",
            data: result.data,
            pagination: result.pagination,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "获取操作日志失败";
        (0, logger_1.error)(`获取操作日志失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.getAdminLogs = getAdminLogs;
/**
 * 获取操作日志统计
 */
const getAdminLogStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "未授权访问",
            });
        }
        const stats = await adminLogService.getAdminLogStats();
        res.json({
            success: true,
            message: "获取操作日志统计成功",
            data: stats,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "获取统计失败";
        (0, logger_1.error)(`获取操作日志统计失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.getAdminLogStats = getAdminLogStats;
/**
 * 获取管理员列表（超级管理员）
 */
const getAdmins = async (req, res) => {
    try {
        const { page = 1, pageSize = 20, keyword } = req.query;
        const where = {
            role: { [sequelize_1.Op.in]: ["admin", "super_admin"] },
        };
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { username: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { nickname: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        const result = await user_model_1.default.findAndCountAll({
            where,
            attributes: { exclude: ["password"] },
            include: [
                {
                    model: role_model_1.default,
                    through: { attributes: [] },
                },
            ],
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            order: [["created_at", "DESC"]],
        });
        res.json({
            success: true,
            message: "获取管理员列表成功",
            data: result.rows.map((item) => ({
                ...item.toJSON(),
                role_name: item.Roles?.[0]?.name,
                role_id: item.Roles?.[0]?.id,
            })),
            pagination: {
                page: Number(page),
                pageSize: Number(pageSize),
                total: result.count,
            },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "获取管理员列表失败";
        (0, logger_1.error)(`获取管理员列表失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.getAdmins = getAdmins;
/**
 * 创建普通管理员（超级管理员）
 */
const createAdmin = async (req, res) => {
    try {
        const { username, password, nickname } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "用户名和密码不能为空",
            });
        }
        const existing = await user_model_1.default.findOne({ where: { username } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "用户名已存在",
            });
        }
        const hashed = await (0, password_1.hashPassword)(password);
        const admin = await user_model_1.default.create({
            username,
            password: hashed,
            nickname: nickname || "管理员",
            role: "admin",
            status: 1,
            points: 0,
        });
        await adminLogService.recordAdminLog(req.user?.id || 0, "创建管理员", "users", admin.id, `创建管理员 ${username}`, req);
        res.json({
            success: true,
            message: "创建管理员成功",
            data: {
                id: admin.id,
                username: admin.username,
                nickname: admin.nickname,
                role: admin.role,
                status: admin.status,
            },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "创建管理员失败";
        (0, logger_1.error)(`创建管理员失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.createAdmin = createAdmin;
/**
 * 删除普通管理员（超级管理员）
 */
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await user_model_1.default.findByPk(Number(id));
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "管理员不存在",
            });
        }
        if (admin.role === "super_admin") {
            return res.status(403).json({
                success: false,
                message: "不能删除超级管理员",
            });
        }
        if (req.user?.id === admin.id) {
            return res.status(403).json({
                success: false,
                message: "不能删除自己",
            });
        }
        await admin.destroy();
        await adminLogService.recordAdminLog(req.user?.id || 0, "删除管理员", "users", admin.id, `删除管理员 ${admin.username}`, req);
        res.json({
            success: true,
            message: "删除管理员成功",
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "删除管理员失败";
        (0, logger_1.error)(`删除管理员失败: ${message}`);
        res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.deleteAdmin = deleteAdmin;
//# sourceMappingURL=admin.controller.js.map