// 管理员控制器
import { Request, Response } from "express";
import { Op } from "sequelize";
import * as authService from "../services/auth.service";
import * as adminLogService from "../services/admin-log.service";
import { recordLoginLog } from "../services/login-log.service";
import { log, error } from "../utils/logger";
import User from "../models/user.model";
import Role from "../models/role.model";
import { hashPassword } from "../utils/password";

/**
 * 管理员登录
 */
export const login = async (req: Request, res: Response) => {
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
    await adminLogService.recordAdminLog(
      result.id,
      adminLogService.ActionTypes.LOGIN,
      undefined,
      undefined,
      `用户 ${username} 登录成功`,
      req,
    );

    log(`管理员 ${username} 登录成功`);

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "";
    recordLoginLog(result.id, clientIp).catch(() => {});

    res.json({
      success: true,
      message: "登录成功",
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "登录失败";
    error(`管理员登录失败: ${message}`);

    res.status(401).json({
      success: false,
      message,
    });
  }
};

/**
 * 管理员登出
 */
export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "未授权访问",
      });
    }

    // 记录操作日志
    await adminLogService.recordAdminLog(
      req.user.id,
      adminLogService.ActionTypes.LOGOUT,
      undefined,
      undefined,
      `用户 ${req.user.username} 登出`,
      req,
    );

    log(`管理员 ${req.user.username} 登出`);

    res.json({
      success: true,
      message: "登出成功",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "登出失败";
    error(`管理员登出失败: ${message}`);

    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 获取管理员个人信息
 */
export const getProfile = async (req: Request, res: Response) => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取信息失败";
    error(`获取管理员信息失败: ${message}`);

    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 修改管理员个人信息
 */
export const editProfile = async (req: Request, res: Response) => {
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

    const updateData: { nickname?: string; avatar?: string } = {};
    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;

    const updatedProfile = await authService.updateAdminProfile(
      req.user.id,
      updateData,
    );

    // 记录操作日志
    await adminLogService.recordAdminLog(
      req.user.id,
      "修改个人信息",
      "users",
      req.user.id,
      `修改了个人信息: ${Object.keys(updateData).join(", ")}`,
      req,
    );

    log(`管理员 ${req.user.username} 修改了个人信息`);

    res.json({
      success: true,
      message: "修改成功",
      data: updatedProfile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "修改失败";
    error(`修改管理员信息失败: ${message}`);

    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 获取操作日志列表
 */
export const getAdminLogs = async (req: Request, res: Response) => {
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
      actionType: actionType as string | undefined,
    });

    res.json({
      success: true,
      message: "获取操作日志成功",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取操作日志失败";
    error(`获取操作日志失败: ${message}`);

    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 获取操作日志统计
 */
export const getAdminLogStats = async (req: Request, res: Response) => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取统计失败";
    error(`获取操作日志统计失败: ${message}`);

    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 获取管理员列表（超级管理员）
 */
export const getAdmins = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;

    const where: any = {
      role: { [Op.in]: ["admin", "super_admin"] },
    };

    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
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
      data: result.rows.map((item: any) => ({
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取管理员列表失败";
    error(`获取管理员列表失败: ${message}`);
    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 创建普通管理员（超级管理员）
 */
export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "用户名和密码不能为空",
      });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "用户名已存在",
      });
    }

    const hashed = await hashPassword(password);
    const admin = await User.create({
      username,
      password: hashed,
      nickname: nickname || "管理员",
      role: "admin",
      status: 1,
      points: 0,
    });

    await adminLogService.recordAdminLog(
      req.user?.id || 0,
      "创建管理员",
      "users",
      admin.id,
      `创建管理员 ${username}`,
      req,
    );

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建管理员失败";
    error(`创建管理员失败: ${message}`);
    res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * 删除普通管理员（超级管理员）
 */
export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await User.findByPk(Number(id));
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

    await adminLogService.recordAdminLog(
      req.user?.id || 0,
      "删除管理员",
      "users",
      admin.id,
      `删除管理员 ${admin.username}`,
      req,
    );

    res.json({
      success: true,
      message: "删除管理员成功",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除管理员失败";
    error(`删除管理员失败: ${message}`);
    res.status(500).json({
      success: false,
      message,
    });
  }
};
