"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.getMyPermissions = exports.updateUserPassword = exports.updateUserProfile = exports.getUserStudyStats = exports.getUserProfile = exports.updateUser = exports.getUser = exports.login = exports.register = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const user_role_model_1 = __importDefault(require("../models/user-role.model"));
const role_permission_model_1 = __importDefault(require("../models/role-permission.model"));
const permission_model_1 = __importDefault(require("../models/permission.model"));
const post_model_1 = __importDefault(require("../models/post.model"));
const comment_model_1 = __importDefault(require("../models/comment.model"));
const view_record_model_1 = __importDefault(require("../models/view-record.model"));
const learning_goal_model_1 = require("../models/learning-goal.model");
const sequelize_1 = require("sequelize");
const password_1 = require("../utils/password");
const auth_service_1 = require("../services/auth.service");
const auth_service_2 = require("../services/auth.service");
const permissions_1 = require("../constants/permissions");
const helper_1 = require("../utils/helper");
const hot_posts_service_1 = require("../services/hot-posts.service");
const validator_1 = require("../utils/validator");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const register = async (req, res) => {
    try {
        const { username, password, nickname } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ success: false, message: "账号和密码不能为空" });
        }
        const passwordStrength = (0, validator_1.validatePasswordStrength)(password);
        if (!passwordStrength.isValid) {
            return res
                .status(400)
                .json({ success: false, message: passwordStrength.message });
        }
        const existing = await user_model_1.default.findOne({ where: { username } });
        if (existing) {
            return res.status(400).json({ success: false, message: "账号已存在" });
        }
        const hashed = await (0, password_1.hashPassword)(password);
        const user = await user_model_1.default.create({
            username,
            password: hashed,
            nickname: nickname || "新用户",
            role: "student",
            status: 1,
            points: 0,
        });
        // 为新注册的学生用户创建默认学习目标
        if (user.role === "student") {
            try {
                await learning_goal_model_1.LearningGoal.create({
                    user_id: user.id,
                    nickname: user.nickname,
                    username: user.username,
                    goal_posts: 3, // 发帖3篇/天
                    goal_comments: 5, // 评论5条/天
                    goal_hot_posts: 2, // 热榜目标2篇/周
                    goal_points: 50 // 积分目标50分/月
                });
                console.log(`✅ 为用户 ${user.username} 创建了默认学习目标`);
            }
            catch (goalError) {
                console.error(`❌ 创建学习目标失败:`, goalError);
                // 不影响用户注册流程，即使学习目标创建失败也要继续
            }
        }
        res.json({
            success: true,
            message: "注册成功",
            data: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "注册失败";
        res.status(500).json({ success: false, message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ success: false, message: "账号和密码不能为空" });
        }
        const user = await user_model_1.default.findOne({ where: { username } });
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "账号或密码错误" });
        }
        if (user.status === 0) {
            return res.status(403).json({ success: false, message: "账户已被封禁" });
        }
        // 检查账号是否被锁定
        const lockStatus = (0, auth_service_2.checkAccountLock)(user);
        if (lockStatus.isLocked) {
            return res.status(403).json({
                success: false,
                message: `账号已被临时锁定，请 ${lockStatus.remainingMinutes} 分钟后重试`
            });
        }
        if (user.role !== "student") {
            return res
                .status(403)
                .json({ success: false, message: "非学生账号无法登录" });
        }
        const ok = await (0, password_1.comparePassword)(password, user.password);
        if (!ok) {
            const failedInfo = await (0, auth_service_2.recordFailedLogin)(user);
            if (failedInfo.isLocked) {
                return res.status(403).json({
                    success: false,
                    message: `登录失败次数过多，账号已被临时锁定 ${LOCK_DURATION_MINUTES} 分钟`
                });
            }
            return res
                .status(401)
                .json({
                success: false,
                message: `账号或密码错误（剩余尝试次数：${failedInfo.remainingAttempts} 次）`
            });
        }
        // 登录成功，重置失败次数
        await (0, auth_service_2.resetFailedLoginAttempts)(user);
        await user.update({ last_login: new Date() });
        const token = (0, auth_service_1.generateToken)({
            id: user.id,
            username: user.username,
            role: user.role,
        });
        res.json({
            success: true,
            message: "登录成功",
            data: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                role: user.role,
                token,
                expiresIn: "7d",
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "登录失败";
        res.status(500).json({ success: false, message });
    }
};
exports.login = login;
const getUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const user = await user_model_1.default.findByPk(id, {
            attributes: { exclude: ["password"] },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "用户不存在" });
        }
        res.json({ success: true, message: "获取成功", data: user });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "获取失败";
        res.status(500).json({ success: false, message });
    }
};
exports.getUser = getUser;
const updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nickname, avatar } = req.body;
        const user = await user_model_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "用户不存在" });
        }
        const updateData = {};
        if (nickname !== undefined)
            updateData.nickname = nickname;
        if (avatar !== undefined)
            updateData.avatar = avatar;
        await user.update(updateData);
        res.json({
            success: true,
            message: "更新成功",
            data: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                role: user.role,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "更新失败";
        res.status(500).json({ success: false, message });
    }
};
exports.updateUser = updateUser;
const getUserProfile = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        // 查询用户基本信息
        const user = await user_model_1.default.findByPk(userId, {
            attributes: ['id', 'username', 'nickname', 'avatar', 'points', 'role', 'status'],
        });
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        // 查询今日统计数据
        const todayStart = (0, helper_1.getStartOfDay)();
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // 查询用户今天发布的帖子和评论
        const [userTodayPosts, userTodayComments] = await Promise.all([
            post_model_1.default.findAll({
                where: {
                    user_id: userId,
                    created_at: { [sequelize_1.Op.gte]: todayStart, [sequelize_1.Op.lt]: tomorrow }
                },
                attributes: ['id']
            }),
            comment_model_1.default.findAll({
                where: {
                    user_id: userId,
                    created_at: { [sequelize_1.Op.gte]: todayStart, [sequelize_1.Op.lt]: tomorrow }
                },
                attributes: ['id']
            })
        ]);
        const userTodayPostIds = userTodayPosts.map((post) => post.id);
        const userTodayCommentIds = userTodayComments.map((comment) => comment.id);
        // 查询这些帖子和评论今天获得的点赞数
        const [todayPostLikes, todayCommentLikes, todayViews, hotPostsCount] = await Promise.all([
            userTodayPostIds.length > 0
                ? post_model_1.default.sum('like_count', {
                    where: {
                        id: { [sequelize_1.Op.in]: userTodayPostIds }
                    }
                })
                : 0,
            userTodayCommentIds.length > 0
                ? comment_model_1.default.sum('like_count', {
                    where: {
                        id: { [sequelize_1.Op.in]: userTodayCommentIds }
                    }
                })
                : 0,
            view_record_model_1.default.count({
                where: {
                    user_id: userId,
                    created_at: { [sequelize_1.Op.gte]: todayStart, [sequelize_1.Op.lt]: tomorrow }
                }
            }),
            (0, hot_posts_service_1.getUserHotPostsCount)(userId)
        ]);
        const totalTodayLikes = (todayPostLikes || 0) + (todayCommentLikes || 0);
        // 查询用户排名
        const higherCount = await user_model_1.default.count({
            where: { status: 1, points: { [sequelize_1.Op.gt]: user.points } },
        });
        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                points: user.points,
                level: (0, helper_1.calculateLevel)(user.points),
                rank: higherCount + 1,
                // 今日统计数据
                todayPosts: userTodayPosts.length || 0,
                todayComments: userTodayComments.length || 0,
                todayLikes: totalTodayLikes,
                todayViews: todayViews || 0,
                hotPostsCount: hotPostsCount || 0,
                // 状态信息
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '获取用户资料失败' });
    }
};
exports.getUserProfile = getUserProfile;
const getUserStudyStats = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        // 统计数据：帖子、评论、积分
        const [postCount, commentCount, points, postLikesSum, commentLikesSum] = await Promise.all([
            post_model_1.default.count({ where: { user_id: userId, publish_status: 1 } }),
            comment_model_1.default.count({ where: { user_id: userId, is_deleted: 0 } }),
            user_model_1.default.findByPk(userId, { attributes: ['points'] }),
            // 总点赞数（自己发的帖子被点赞 + 自己评论被点赞）
            post_model_1.default.sum('like_count', { where: { user_id: userId } }),
            comment_model_1.default.sum('like_count', { where: { user_id: userId } })
        ]);
        // TODO: 学习时长应该从学习记录表获取，这里暂时使用示例值
        const studyHours = 45;
        res.json({
            success: true,
            data: {
                totalPoints: points?.points || 0,
                level: (0, helper_1.calculateLevel)(points?.points || 0),
                studyHours: studyHours,
                streakDays: 7,
                postsCount: postCount || 0,
                commentsCount: commentCount || 0,
                likesReceived: (postLikesSum || 0) + (commentLikesSum || 0),
                // TODO: activeDays 应该根据用户的实际活跃记录计算
                activeDays: 30
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '获取学习统计失败' });
    }
};
exports.getUserStudyStats = getUserStudyStats;
const updateUserProfile = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { nickname, avatar } = req.body;
        const user = await user_model_1.default.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        // 权限验证：只能修改自己的资料或管理员修改
        if (req.user?.id !== userId && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: '无权限修改此用户资料' });
        }
        // 更新数据
        const updateData = {};
        if (nickname !== undefined)
            updateData.nickname = nickname;
        if (avatar !== undefined)
            updateData.avatar = avatar;
        await user.update(updateData);
        // 返回更新后的用户信息
        const updatedUser = await user_model_1.default.findByPk(userId, {
            attributes: ['id', 'username', 'nickname', 'avatar', 'points', 'role']
        });
        res.json({
            success: true,
            message: '更新成功',
            data: updatedUser
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '更新失败' });
    }
};
exports.updateUserProfile = updateUserProfile;
const updateUserPassword = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { currentPassword, newPassword } = req.body;
        // 参数验证
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '当前密码和新密码都不能为空'
            });
        }
        // 密码强度校验（与注册时的校验逻辑一致）
        const passwordStrength = (0, validator_1.validatePasswordStrength)(newPassword);
        if (!passwordStrength.isValid) {
            return res.status(400).json({
                success: false,
                message: passwordStrength.message
            });
        }
        // 权限验证：只能修改自己的密码
        if (req.user?.id !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权限修改此用户密码'
            });
        }
        // 查找用户
        const user = await user_model_1.default.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        // 验证当前密码
        const isCurrentPasswordValid = await (0, password_1.comparePassword)(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '当前密码错误'
            });
        }
        // 生成新密码哈希
        const hashedNewPassword = await (0, password_1.hashPassword)(newPassword);
        // 更新密码
        await user.update({
            password: hashedNewPassword
        });
        res.json({
            success: true,
            message: '密码修改成功'
        });
    }
    catch (error) {
        console.error('密码更新失败:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '密码更新失败'
        });
    }
};
exports.updateUserPassword = updateUserPassword;
const getMyPermissions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "未授权访问" });
        }
        if (req.user.role === "super_admin") {
            const permissions = await permission_model_1.default.findAll({
                where: { code: permissions_1.PERMISSION_CODES },
                attributes: ["code"],
            });
            return res.json({
                success: true,
                data: permissions.length > 0
                    ? permissions.map((item) => item.code)
                    : permissions_1.PERMISSION_CODES,
            });
        }
        if (req.user.role !== "admin") {
            return res.json({ success: true, data: [] });
        }
        const userRole = await user_role_model_1.default.findOne({
            where: { user_id: req.user.id },
        });
        if (!userRole) {
            return res.json({ success: true, data: [] });
        }
        const rolePermissions = await role_permission_model_1.default.findAll({
            where: { role_id: userRole.role_id },
        });
        if (rolePermissions.length === 0) {
            return res.json({ success: true, data: [] });
        }
        const permissionIds = rolePermissions.map((item) => item.permission_id);
        const permissions = await permission_model_1.default.findAll({
            where: { id: permissionIds, code: permissions_1.PERMISSION_CODES },
            attributes: ["code"],
        });
        res.json({
            success: true,
            data: permissions.map((item) => item.code),
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "获取权限失败";
        res.status(500).json({ success: false, message });
    }
};
exports.getMyPermissions = getMyPermissions;
/**
 * 上传用户头像
 */
const uploadAvatar = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "未授权访问" });
        }
        const userId = req.user.id;
        // 上传头像到 OSS
        const avatarUrl = await (0, upload_middleware_1.uploadSingleFileToOss)(req);
        if (!avatarUrl) {
            return res.status(400).json({ success: false, message: "请选择要上传的头像" });
        }
        // 更新用户头像
        const user = await user_model_1.default.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "用户不存在" });
        }
        await user.update({ avatar: avatarUrl });
        res.json({
            success: true,
            message: "头像上传成功",
            data: {
                avatar: avatarUrl,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "头像上传失败";
        res.status(500).json({ success: false, message });
    }
};
exports.uploadAvatar = uploadAvatar;
//# sourceMappingURL=user.controller.js.map