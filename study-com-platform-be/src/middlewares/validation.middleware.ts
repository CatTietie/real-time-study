// 数据验证中间件
import { Request, Response, NextFunction } from "express";

export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 数据验证逻辑
  next();
};
