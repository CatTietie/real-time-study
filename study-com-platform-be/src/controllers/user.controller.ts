// 用户控制器
import { Request, Response } from "express";
import User from "../models/user.model";
import UserRole from "../models/user-role.model";
import RolePermission from "../models/role-permission.model";
import Permission from "../models/permission.model";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import ViewRecord from "../models/view-record.model";
import { LearningGoal } from "../models/learning-goal.model";
import { Op, Sequelize } from "sequelize";
import { comparePassword, hashPassword } from "../utils/password";
import { generateToken } from "../services/auth.service";
import { 
  checkAccountLock, 
  recordFailedLogin, 
  resetFailedLoginAttempts 
} from "../services/auth.service";
import { PERMISSION_CODES } from "../constants/permissions";
import { calculateLevel, getStartOfDay, getStartOfWeek } from "../utils/helper";
import { getUserHotPostsCount } from "../services/hot-posts.service";
import { validatePasswordStrength } from "../utils/validator";
import type { PasswordStrengthResult } from "../utils/validator";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, nickname } = req.body as {
      username?: string;
      password?: string;
      nickname?: string;
    };

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "账号和密码不能为空" });
    }

    const passwordStrength = validatePasswordStrength(password);
    if (!passwordStrength.isValid) {
      return res
        .status(400)
        .json({ success: false, message: passwordStrength.message });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: "账号已存在" });
    }

    const hashed = await hashPassword(password);
    const user = await User.create({
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
        await LearningGoal.create({
          user_id: user.id,
          nickname: user.nickname,
          username: user.username,
          goal_posts: 3,      // 发帖3篇/天
          goal_comments: 5,   // 评论5条/天
          goal_hot_posts: 2,  // 热榜目标2篇/周
          goal_points: 50     // 积分目标50分/月
        });
        console.log(`✅ 为用户 ${user.username} 创建了默认学习目标`);
      } catch (goalError) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败";
    res.status(500).json({ success: false, message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "账号和密码不能为空" });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "账号或密码错误" });
    }

    if (user.status === 0) {
      return res.status(403).json({ success: false, message: "账户已被封禁" });
    }

    // 检查账号是否被锁定
    const lockStatus = checkAccountLock(user);
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

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      const failedInfo = await recordFailedLogin(user);
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
    await resetFailedLoginAttempts(user);

    await user.update({ last_login: new Date() });

    const token = generateToken({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败";
    res.status(500).json({ success: false, message });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    res.json({ success: true, message: "获取成功", data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nickname, avatar } = req.body as {
      nickname?: string;
      avatar?: string;
    };

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    const updateData: { nickname?: string; avatar?: string } = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) updateData.avatar = avatar;

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // 查询用户基本信息
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'nickname', 'avatar', 'points', 'role', 'status'],
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 查询今日统计数据
    const todayStart = getStartOfDay();
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 查询用户今天发布的帖子和评论
    const [userTodayPosts, userTodayComments] = await Promise.all([
      Post.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
        },
        attributes: ['id']
      }),
      Comment.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
        },
        attributes: ['id']
      })
    ]);
    
    const userTodayPostIds = userTodayPosts.map((post: any) => post.id);
    const userTodayCommentIds = userTodayComments.map((comment: any) => comment.id);
    
    // 查询这些帖子和评论今天获得的点赞数
    const [todayPostLikes, todayCommentLikes, todayViews, hotPostsCount] = await Promise.all([
      userTodayPostIds.length > 0 
        ? Post.sum('like_count', {
            where: {
              id: { [Op.in]: userTodayPostIds }
            }
          })
        : 0,
      userTodayCommentIds.length > 0
        ? Comment.sum('like_count', {
            where: {
              id: { [Op.in]: userTodayCommentIds }
            }
          })
        : 0,
      ViewRecord.count({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
        }
      }),
      getUserHotPostsCount(userId)
    ]);
    
    const totalTodayLikes = (todayPostLikes || 0) + (todayCommentLikes || 0);
    
    // 查询用户排名
    const higherCount = await User.count({
      where: { status: 1, points: { [Op.gt]: user.points } },
    });
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        points: user.points,
        level: calculateLevel(user.points),
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
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户资料失败' });
  }
};

export const getUserStudyStats = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // 统计数据：帖子、评论、积分
    const [postCount, commentCount, points, postLikesSum, commentLikesSum] = await Promise.all([
      Post.count({ where: { user_id: userId, publish_status: 1 } }),
      Comment.count({ where: { user_id: userId, is_deleted: 0 } }),
      User.findByPk(userId, { attributes: ['points'] }),
      // 总点赞数（自己发的帖子被点赞 + 自己评论被点赞）
      Post.sum('like_count', { where: { user_id: userId } }),
      Comment.sum('like_count', { where: { user_id: userId } })
    ]);
    
    // TODO: 学习时长应该从学习记录表获取，这里暂时使用示例值
    const studyHours = 45;
    
    res.json({
      success: true,
      data: {
        totalPoints: points?.points || 0,
        level: calculateLevel(points?.points || 0),
        studyHours: studyHours,
        streakDays: 7,
        postsCount: postCount || 0,
        commentsCount: commentCount || 0,
        likesReceived: (postLikesSum || 0) + (commentLikesSum || 0),
        // TODO: activeDays 应该根据用户的实际活跃记录计算
        activeDays: 30
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: '获取学习统计失败' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { nickname, avatar } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 权限验证：只能修改自己的资料或管理员修改
    if (req.user?.id !== userId && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '无权限修改此用户资料' });
    }
    
    // 更新数据
    const updateData: any = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    await user.update(updateData);
    
    // 返回更新后的用户信息
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'username', 'nickname', 'avatar', 'points', 'role']
    });
    
    res.json({
      success: true,
      message: '更新成功',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' });
  }
};

export const updateUserPassword = async (req: Request, res: Response) => {
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
    const passwordStrength = validatePasswordStrength(newPassword);
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
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }
    
    // 验证当前密码
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: '当前密码错误' 
      });
    }
    
    // 生成新密码哈希
    const hashedNewPassword = await hashPassword(newPassword);
    
    // 更新密码
    await user.update({
      password: hashedNewPassword
    });
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('密码更新失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : '密码更新失败' 
    });
  }
};

export const getMyPermissions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    if (req.user.role === "super_admin") {
      const permissions = await Permission.findAll({
        where: { code: PERMISSION_CODES },
        attributes: ["code"],
      });
      return res.json({
        success: true,
        data:
          permissions.length > 0
            ? permissions.map((item) => item.code)
            : PERMISSION_CODES,
      });
    }

    if (req.user.role !== "admin") {
      return res.json({ success: true, data: [] });
    }

    const userRole = await UserRole.findOne({
      where: { user_id: req.user.id },
    });
    if (!userRole) {
      return res.json({ success: true, data: [] });
    }

    const rolePermissions = await RolePermission.findAll({
      where: { role_id: userRole.role_id },
    });

    if (rolePermissions.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const permissionIds = rolePermissions.map((item) => item.permission_id);
    const permissions = await Permission.findAll({
      where: { id: permissionIds, code: PERMISSION_CODES },
      attributes: ["code"],
    });

    res.json({
      success: true,
      data: permissions.map((item) => item.code),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取权限失败";
    res.status(500).json({ success: false, message });
  }
};
