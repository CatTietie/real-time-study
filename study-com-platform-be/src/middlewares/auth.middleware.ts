// 认证中间件
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";
import UserRole from "../models/user-role.model";
import Permission from "../models/permission.model";
import RolePermission from "../models/role-permission.model";

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

/**
 * JWT 认证中间件
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "未提供 Token，请先登录",
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Token 无效或已过期，请重新登录",
      });
    }

    // 将用户信息挂在 req 上
    req.user = decoded;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "认证失败";
    res.status(401).json({
      success: false,
      message,
    });
  }
};

/**
 * 管理员权限中间件
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "权限验证失败";
    res.status(403).json({
      success: false,
      message,
    });
  }
};

/**
 * 超级管理员权限中间件
 */
export const superAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "权限验证失败";
    res.status(403).json({
      success: false,
      message,
    });
  }
};

export default authMiddleware;

/**
 * 权限验证中间件 - 检查管理员是否拥有指定权限码
 */
export const requirePermission = (permissionCode: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "未授权访问" });
      }

      if (req.user.role === "super_admin") {
        return next();
      }

      const userRole = await UserRole.findOne({ where: { user_id: req.user.id } });
      if (!userRole) {
        return res.status(403).json({ success: false, message: "未分配角色，无权操作" });
      }

      const permission = await Permission.findOne({ where: { code: permissionCode } });
      if (!permission) {
        return res.status(403).json({ success: false, message: "权限未定义" });
      }

      const rolePermission = await RolePermission.findOne({
        where: { role_id: (userRole as any).role_id, permission_id: (permission as any).id },
      });

      if (!rolePermission) {
        return res.status(403).json({ success: false, message: "无此操作权限" });
      }

      next();
    } catch (error) {
      res.status(403).json({ success: false, message: "权限验证失败" });
    }
  };
};
