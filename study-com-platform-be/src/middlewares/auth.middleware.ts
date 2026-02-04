// 认证中间件
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";

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
