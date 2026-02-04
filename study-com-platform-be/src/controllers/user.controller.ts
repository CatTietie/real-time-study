// 用户控制器
import { Request, Response } from "express";
import User from "../models/user.model";
import UserRole from "../models/user-role.model";
import RolePermission from "../models/role-permission.model";
import Permission from "../models/permission.model";
import { comparePassword, hashPassword } from "../utils/password";
import { generateToken } from "../services/auth.service";
import { PERMISSION_CODES } from "../constants/permissions";

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

    if (user.role !== "student") {
      return res
        .status(403)
        .json({ success: false, message: "非学生账号无法登录" });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "账号或密码错误" });
    }

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
