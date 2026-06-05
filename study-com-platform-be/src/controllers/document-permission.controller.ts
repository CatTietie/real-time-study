import { Request, Response } from "express";
import DocumentPermissionService from "../services/document-permission.service";

export const getMyPermission = async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const level = await DocumentPermissionService.getEffectivePermission(documentId, userId, userRole);

    res.json({
      success: true,
      data: { permission_level: level },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取权限失败" });
  }
};

export const listPermissions = async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    const permissions = await DocumentPermissionService.listPermissions(documentId);

    res.json({ success: true, data: permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取权限列表失败" });
  }
};

export const grantPermission = async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    const { target_type, target_id, permission_level } = req.body;
    const grantedBy = (req as any).user.id;

    if (!["all", "role", "user"].includes(target_type)) {
      return res.status(400).json({ success: false, message: "无效的目标类型" });
    }
    if (!["view", "comment", "edit", "manage"].includes(permission_level)) {
      return res.status(400).json({ success: false, message: "无效的权限级别" });
    }
    if (target_type !== "all" && !target_id) {
      return res.status(400).json({ success: false, message: "目标ID不能为空" });
    }

    const permission = await DocumentPermissionService.grantPermission(
      documentId,
      target_type,
      target_type === "all" ? null : target_id,
      permission_level,
      grantedBy
    );

    res.status(201).json({ success: true, data: permission, message: "权限授予成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "授予权限失败" });
  }
};

export const revokePermission = async (req: Request, res: Response) => {
  try {
    const permissionId = Number(req.params.pid);

    const success = await DocumentPermissionService.revokePermission(permissionId);
    if (!success) {
      return res.status(404).json({ success: false, message: "权限记录不存在" });
    }

    res.json({ success: true, message: "权限已撤销" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "撤销权限失败" });
  }
};

export const batchSetPermissions = async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    const { permissions } = req.body;
    const grantedBy = (req as any).user.id;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: "permissions 必须是数组" });
    }

    for (const p of permissions) {
      if (!["all", "role", "user"].includes(p.target_type)) {
        return res.status(400).json({ success: false, message: "无效的目标类型" });
      }
      if (!["view", "comment", "edit", "manage"].includes(p.permission_level)) {
        return res.status(400).json({ success: false, message: "无效的权限级别" });
      }
    }

    const result = await DocumentPermissionService.batchSetPermissions(
      documentId,
      permissions,
      grantedBy
    );

    res.json({ success: true, data: result, message: "权限设置成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "设置权限失败" });
  }
};
