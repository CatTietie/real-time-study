import { Request, Response, NextFunction } from "express";
import DocumentPermissionService, { PermissionLevel } from "../services/document-permission.service";

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  view: 1,
  comment: 2,
  edit: 3,
  manage: 4,
};

export const requireDocumentPermission = (minLevel: PermissionLevel) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documentId = Number(req.params.id);
      if (!documentId || isNaN(documentId)) {
        return res.status(400).json({ success: false, message: "无效的文档ID" });
      }

      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        return res.status(401).json({ success: false, message: "未登录" });
      }

      const effectiveLevel = await DocumentPermissionService.getEffectivePermission(
        documentId,
        userId,
        userRole
      );

      if (!effectiveLevel || PERMISSION_RANK[effectiveLevel] < PERMISSION_RANK[minLevel]) {
        return res.status(403).json({ success: false, message: "无此文档的操作权限" });
      }

      (req as any).documentPermission = effectiveLevel;
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "权限检查失败" });
    }
  };
};
