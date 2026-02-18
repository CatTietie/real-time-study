"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminProfile = exports.getAdminProfile = exports.adminLogin = exports.verifyToken = exports.refreshToken = exports.generateToken = void 0;
// 认证服务
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const password_1 = require("../utils/password");
/**
 * 生成 JWT Token（7天有效期）
 */
const generateToken = (user) => {
    const options = {
        expiresIn: "7d",
    };
    return jsonwebtoken_1.default.sign(user, process.env.JWT_SECRET || "default-secret-key", options);
};
exports.generateToken = generateToken;
/**
 * 刷新 Token
 */
const refreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "default-secret-key");
        return (0, exports.generateToken)(decoded);
    }
    catch (error) {
        return null;
    }
};
exports.refreshToken = refreshToken;
/**
 * 验证 Token
 */
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "default-secret-key");
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
/**
 * 管理员登录
 */
const adminLogin = async (username, password) => {
    // 查找用户
    const user = await user_model_1.default.findOne({
        where: { username },
    });
    if (!user) {
        throw new Error("用户名或密码错误");
    }
    // 检查用户是否被封禁
    if (user.status === 0) {
        throw new Error("账户已被封禁，无法登录");
    }
    // 检查是否为管理员
    if (user.role !== "admin" && user.role !== "super_admin") {
        throw new Error("该账户无管理员权限");
    }
    // 验证密码
    const isPasswordValid = await (0, password_1.comparePassword)(password, user.password);
    if (!isPasswordValid) {
        throw new Error("用户名或密码错误");
    }
    // 更新最后登录时间
    await user.update({ last_login: new Date() });
    // 生成 Token
    const token = (0, exports.generateToken)({
        id: user.id,
        username: user.username,
        role: user.role,
    });
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        token,
        expiresIn: "7d",
    };
};
exports.adminLogin = adminLogin;
/**
 * 获取管理员信息
 */
const getAdminProfile = async (userId) => {
    const user = await user_model_1.default.findByPk(userId, {
        attributes: {
            exclude: ["password"],
        },
    });
    if (!user) {
        throw new Error("用户不存在");
    }
    if (user.role !== "admin" && user.role !== "super_admin") {
        throw new Error("该账户无管理员权限");
    }
    return user;
};
exports.getAdminProfile = getAdminProfile;
/**
 * 更新管理员信息
 */
const updateAdminProfile = async (userId, data) => {
    const user = await user_model_1.default.findByPk(userId);
    if (!user) {
        throw new Error("用户不存在");
    }
    if (user.role !== "admin" && user.role !== "super_admin") {
        throw new Error("该账户无管理员权限");
    }
    // 更新允许的字段
    const updateData = {};
    if (data.nickname !== undefined)
        updateData.nickname = data.nickname;
    if (data.avatar !== undefined)
        updateData.avatar = data.avatar;
    await user.update(updateData);
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
    };
};
exports.updateAdminProfile = updateAdminProfile;
//# sourceMappingURL=auth.service.js.map